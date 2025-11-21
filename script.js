/* script.js - dashboard logic (clean, full-featured, no QR, no paste) */

(() => {
  const LS_ITEMS = 'items';
  let items = JSON.parse(localStorage.getItem(LS_ITEMS) || '[]');

  // init on load
  document.addEventListener('DOMContentLoaded', () => {
    applyRoleUI();
    bindFormFileInput();
    renderInventory();
    bindBorrowForm();
  });

  function applyRoleUI() {
    const role = localStorage.getItem('userRole');
    const adminForm = document.getElementById('admin-form');
    const adminStats = document.getElementById('admin-stats');
    const adminButtons = document.getElementById('admin-buttons');
    const inventory = document.getElementById('inventory-table');
    const tableTitle = document.getElementById('table-title');
    const borrow = document.getElementById('borrow-container');

    if (role === 'user') {
      if (adminForm) adminForm.style.display = 'none';
      if (adminStats) adminStats.style.display = 'none';
      if (adminButtons) adminButtons.style.display = 'none';
      if (inventory) inventory.style.display = 'none';
      if (tableTitle) tableTitle.style.display = 'none';
      if (borrow) borrow.style.display = 'block';
    } else {
      // admin
      if (adminForm) adminForm.style.display = 'block';
      if (adminStats) adminStats.style.display = 'flex';
      if (adminButtons) adminButtons.style.display = 'flex';
      if (inventory) inventory.style.display = 'block';
      if (tableTitle) tableTitle.style.display = 'block';
      if (borrow) borrow.style.display = 'none';
    }
  }

  function bindFormFileInput() {
    const fileInput = document.getElementById('form-foto-file');
    const hidden = document.getElementById('form-foto');
    const preview = document.getElementById('preview');
    if (!fileInput) return;
    fileInput.addEventListener('change', function(){
      const f = this.files && this.files[0];
      if (!f) {
        if (hidden) hidden.value = '';
        if (preview) { preview.src=''; preview.style.display='none'; }
        return;
      }
      const reader = new FileReader();
      reader.onload = function(e){
        if (hidden) hidden.value = e.target.result;
        if (preview) { preview.src = e.target.result; preview.style.display = 'block'; }
      };
      reader.readAsDataURL(f);
    });
  }

  // form submit for add/edit
  document.getElementById('form')?.addEventListener('submit', function(e){
    e.preventDefault();
    const idEl = document.getElementById('form-id');
    const nisn = document.getElementById('form-nisn').value.trim();
    const nama = document.getElementById('form-nama').value.trim();
    const kode = document.getElementById('form-kode').value.trim();
    const jumlah = Number(document.getElementById('form-jumlah').value) || 1;
    const status = document.getElementById('form-status').value;
    const foto = document.getElementById('form-foto')?.value || '';

    if (!nama || !kode) { alert('Nama dan Kode wajib diisi'); return; }

    const now = new Date().toISOString();

    if (idEl && idEl.value) {
      // edit existing
      const idx = items.findIndex(i => i.id === idEl.value);
      if (idx === -1) { alert('Item untuk diedit tidak ditemukan'); resetForm(); return; }
      const prev = Object.assign({}, items[idx]);
      items[idx] = { ...items[idx], nisn, nama, kode, jumlah, status, foto, updatedAt: now };
      saveItems();
      try { window.addHistory && window.addHistory({ type:'edit', nama, kode, sebelumnya: prev, waktu: now }); } catch(e){}
      resetForm();
      renderInventory();
      return;
    }

    // new item
    const item = { id: 'item_' + Date.now(), nisn, nama, kode, jumlah, status, foto, createdAt: now, updatedAt: now };
    items.push(item);
    saveItems();
    try { window.addHistory && window.addHistory({ type:'tambah', nama, kode, waktu: now }); } catch(e){}
    resetForm();
    renderInventory();
  });

  function resetForm() {
    const ids = ['form-id','form-nisn','form-nama','form-kode','form-jumlah','form-status'];
    ids.forEach(i => { const el = document.getElementById(i); if (el) el.value = ''; });
    const hf = document.getElementById('form-foto'); if (hf) hf.value = '';
    const ff = document.getElementById('form-foto-file'); if (ff) ff.value = null;
    const pv = document.getElementById('preview'); if (pv) { pv.src=''; pv.style.display='none'; }
  }
  window.resetForm = resetForm;

  function saveItems() {
    localStorage.setItem(LS_ITEMS, JSON.stringify(items));
  }

  function renderInventory() {
    const tbody = document.getElementById('tabel-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    items.forEach(item => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="text-align:center;">${item.foto ? `<img src="${item.foto}" style="width:60px;height:40px;object-fit:cover;border-radius:6px" />` : '-'}</td>
        <td>${item.nisn || ''}</td>
        <td>${item.nama}</td>
        <td>${item.kode}</td>
        <td>${item.jumlah}</td>
        <td>${item.status}</td>
        <td>
          <button class="aksi-btn edit" onclick="editItem('${item.id}')">Edit</button>
          <button class="aksi-btn hapus" onclick="deleteItem('${item.id}')">Hapus</button>
          <button class="aksi-btn notif" onclick="triggerNotifPinjamById('${item.id}')">Notif Pinjam</button>
          <button class="aksi-btn notif" onclick="triggerNotifRusakById('${item.id}')">Notif Rusak</button>
          ${item.status === 'Dipinjam' ? `<button class="aksi-btn" onclick="kembalikanById('${item.id}')">Kembalikan</button>` : ''}
        </td>
      `;
      tbody.appendChild(tr);
    });
    updateStats();
  }
  window.renderInventory = renderInventory;

  function editItem(id) {
    const it = items.find(i => i.id === id);
    if (!it) return alert('Item tidak ditemukan');
    document.getElementById('form-id').value = it.id;
    document.getElementById('form-nisn').value = it.nisn || '';
    document.getElementById('form-nama').value = it.nama || '';
    document.getElementById('form-kode').value = it.kode || '';
    document.getElementById('form-jumlah').value = it.jumlah || 1;
    document.getElementById('form-status').value = it.status || 'Baik';
    const hf = document.getElementById('form-foto'); if (hf) hf.value = it.foto || '';
    const pv = document.getElementById('preview'); if (pv && it.foto) { pv.src = it.foto; pv.style.display = 'block'; }
  }
  window.editItem = editItem;

  function deleteItem(id) {
    if (!confirm('Hapus item ini?')) return;
    const idx = items.findIndex(i => i.id === id);
    if (idx === -1) return;
    const prev = items[idx];
    items.splice(idx,1);
    saveItems();
    try { window.addHistory && window.addHistory({ type:'hapus', nama:prev.nama, kode:prev.kode, waktu:new Date().toISOString() }); } catch(e){}
    renderInventory();
  }
  window.deleteItem = deleteItem;

  function updateStats() {
    document.getElementById('total').innerText = items.length;
    document.getElementById('baik').innerText = items.filter(i => i.status === 'Baik').length;
    document.getElementById('rusak').innerText = items.filter(i => i.status === 'Rusak').length;
    document.getElementById('pinjam').innerText = items.filter(i => i.status === 'Dipinjam').length;
  }

  // Borrow form for users
  function bindBorrowForm() {
    const borrowForm = document.getElementById('borrow-form');
    if (!borrowForm) return;
    borrowForm.addEventListener('submit', function(e){
      e.preventDefault();
      const nama = document.getElementById('pinjam-nama').value.trim();
      const kode = document.getElementById('pinjam-kode').value.trim();
      const jumlah = Number(document.getElementById('pinjam-jumlah').value) || 1;
      const alasan = document.getElementById('pinjam-alasan').value.trim();
      const username = localStorage.getItem('username') || 'guest';

      const req = { id: 'req_' + Date.now(), user: username, nama, kode, jumlah, alasan, status:'pending', createdAt: new Date().toISOString() };

      const list = JSON.parse(localStorage.getItem('borrow_requests') || '[]');
      list.push(req);
      localStorage.setItem('borrow_requests', JSON.stringify(list));
      alert('Permintaan pinjam terkirim. Tunggu verifikasi oleh admin.');
      borrowForm.reset();

      // record history (optional)
      try { window.addHistory && window.addHistory({ type:'permintaan', nama, kode, peminjam: username, waktu:new Date().toISOString() }); } catch(e){}
    });
  }

  // Notification wrappers (use notif.js if available)
  window.triggerNotifPinjamById = function(id) {
    const item = items.find(i => i.id === id);
    if (!item) return alert('Item tidak ditemukan');
    const peminjam = prompt(`Masukkan nama peminjam untuk "${item.nama}"`);
    if (!peminjam) return;
    item.status = 'Dipinjam';
    saveItems();
    renderInventory();
    try { if (typeof window.notifPinjam === 'function') window.notifPinjam(item.nama, peminjam, item.kode); } catch(e){}
    try { window.addHistory && window.addHistory({ type:'pinjam', nama:item.nama, kode:item.kode, peminjam, waktu:new Date().toISOString() }); } catch(e){}
  };

  window.triggerNotifRusakById = function(id) {
    const item = items.find(i => i.id === id);
    if (!item) return alert('Item tidak ditemukan');
    const keterangan = prompt(`Deskripsikan kerusakan untuk "${item.nama}"`);
    if (!keterangan) return;
    item.status = 'Rusak';
    saveItems();
    renderInventory();
    try { if (typeof window.notifRusak === 'function') window.notifRusak(item.nama, keterangan, item.kode); } catch(e){}
    try { window.addHistory && window.addHistory({ type:'rusak', nama:item.nama, kode:item.kode, keterangan, waktu:new Date().toISOString() }); } catch(e){}
  };

  window.kembalikanById = function(id) {
    if (!confirm('Kembalikan barang ini?')) return;
    const item = items.find(i => i.id === id);
    if (!item) return alert('Item tidak ditemukan');
    item.status = 'Baik';
    saveItems();
    renderInventory();
    try { if (typeof window.notifKembali === 'function') window.notifKembali(item.nama, item.kode); } catch(e){}
    try { window.addHistory && window.addHistory({ type:'kembali', nama:item.nama, kode:item.kode, waktu:new Date().toISOString() }); } catch(e){}
  };

  // Konfirmasi pinjam by kode (useful if you later re-add scanner)
  window.konfirmasiPinjamByKode = function(kode, peminjam) {
    const idx = items.findIndex(d => d.kode === kode);
    if (idx === -1) { alert('Barang dengan kode tersebut tidak ditemukan.'); return; }
    items[idx].status = 'Dipinjam';
    saveItems();
    renderInventory();
    try { if (typeof window.notifPinjam === 'function') window.notifPinjam(items[idx].nama, peminjam, items[idx].kode); } catch(e){}
    try { window.addHistory && window.addHistory({ type:'pinjam', nama: items[idx].nama, kode: items[idx].kode, peminjam, waktu:new Date().toISOString() }); } catch(e){}
  };

  // EXPORT CSV (simple)
  window.exportCSV = function() {
    const rows = [
      ['NISN','Nama','Kode','Jumlah','Status','FotoBase64']
    ];
    items.forEach(i => rows.push([ i.nisn || '', i.nama || '', i.kode || '', i.jumlah || '', i.status || '', i.foto || '' ]));
    const csv = rows.map(r => r.map(c => `"${(c||'').toString().replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'inventaris_tkj.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  // EXPORT XLSX (SheetJS)
  window.exportXLSX = function() {
    if (typeof XLSX === 'undefined') { alert('Library XLSX tidak ditemukan.'); return; }
    const aoa = [['NISN','Nama','Kode','Jumlah','Status','FotoBase64']];
    items.forEach(i => aoa.push([ i.nisn || '', i.nama || '', i.kode || '', i.jumlah || '', i.status || '', i.foto || '' ]));
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inventaris');
    XLSX.writeFile(wb, 'inventaris_tkj.xlsx');
  };

})();

const AsetModel = require('../models/asetModel');
const PDFDocument = require('pdfkit');
const { Document, Packer, Paragraph, Table, TableRow, TableCell,
        TextRun, AlignmentType, WidthType, HeadingLevel } = require('docx');
const fs = require('fs');
const path = require('path');

// =============================================
//  HELPERS LABEL
// =============================================
const kondisiLabel = { good: 'Baik', minor_damage: 'Rusak Ringan', major_damage: 'Rusak Berat' };
const statusLabel  = { available: 'Tersedia', in_use: 'Digunakan', maintenance: 'Perbaikan', retired: 'Pensiun' };
const perolehanLabel = { procurement: 'Pengadaan', grant: 'Hibah' };

// =============================================
//  WEB VIEWS
// =============================================

// GET /aset — Daftar aset ruangan
const index = async (req, res, next) => {
  try {
    const q          = req.query.q || '';
    const buildingId = parseInt(req.query.building_id) || 0;
    const flash      = req.session.flash || null;
    delete req.session.flash;

    const asets    = await AsetModel.getAll(q, buildingId);
    const stats    = await AsetModel.getStats();
    const buildings = await AsetModel.getAllBuildings();

    res.render('aset/index', {
      title: 'Aset Ruangan',
      asets, stats, buildings, q, buildingId, flash,
      user: req.session.username,
      kondisiLabel, statusLabel,
    });
  } catch (err) {
    next(err);
  }
};

// GET /aset/create — Form tambah
const create = async (req, res, next) => {
  try {
    const flash     = req.session.flash || null;
    delete req.session.flash;
    const buildings = await AsetModel.getAllBuildings();
    const grants    = await AsetModel.getAllGrants();
    res.render('aset/create', {
      title: 'Tambah Aset Ruangan',
      buildings, grants, flash,
      user: req.session.username,
      errors: null,
      old: {},
    });
  } catch (err) {
    next(err);
  }
};

// POST /aset/store — Simpan aset ruangan baru
const store = async (req, res, next) => {
  try {
    const {
      room_name, room_code, floor, capacity, is_public, building_id,
      asset_name, asset_code, acquisition_type, acquisition_date,
      acquisition_cost, asset_grant_id, condition, status,
    } = req.body;

    const errors = [];
    if (!room_name?.trim())      errors.push('Nama ruangan wajib diisi.');
    if (!room_code?.trim())      errors.push('Kode ruangan wajib diisi.');
    if (!building_id)            errors.push('Gedung wajib dipilih.');
    if (!asset_name?.trim())     errors.push('Nama aset wajib diisi.');
    if (!asset_code?.trim())     errors.push('Kode aset wajib diisi.');
    if (!acquisition_type)       errors.push('Cara perolehan wajib dipilih.');
    if (!acquisition_date)       errors.push('Tanggal perolehan wajib diisi.');
    if (!condition)              errors.push('Kondisi wajib dipilih.');
    if (!status)                 errors.push('Status wajib dipilih.');

    if (errors.length > 0) {
      const buildings = await AsetModel.getAllBuildings();
      const grants    = await AsetModel.getAllGrants();
      return res.render('aset/create', {
        title: 'Tambah Aset Ruangan',
        buildings, grants,
        user: req.session.username,
        errors,
        old: req.body,
      });
    }

    const photo = req.file ? req.file.filename : null;

    await AsetModel.create({
      room_name: room_name.trim(),
      room_code: room_code.trim(),
      floor,
      capacity: parseInt(capacity) || 0,
      is_public: is_public === '1',
      building_id: parseInt(building_id),
      asset_name: asset_name.trim(),
      asset_code: asset_code.trim(),
      acquisition_type,
      acquisition_date,
      acquisition_cost: acquisition_cost || null,
      asset_grant_id: asset_grant_id || null,
      condition,
      status,
      photo,
    });

    req.session.flash = { type: 'success', message: `Ruangan "${room_name}" berhasil ditambahkan.` };
    res.redirect('/aset');
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      req.session.flash = { type: 'error', message: 'Kode aset ruangan sudah digunakan. Gunakan kode yang berbeda.' };
      return res.redirect('/aset/create');
    }
    next(err);
  }
};

// GET /aset/:id/edit — Form edit
const edit = async (req, res, next) => {
  try {
    const aset = await AsetModel.getById(req.params.id);
    if (!aset) {
      req.session.flash = { type: 'error', message: 'Aset ruangan tidak ditemukan.' };
      return res.redirect('/aset');
    }
    const flash     = req.session.flash || null;
    delete req.session.flash;
    const buildings = await AsetModel.getAllBuildings();
    const grants    = await AsetModel.getAllGrants();
    res.render('aset/edit', {
      title: 'Edit Aset Ruangan',
      aset, buildings, grants, flash,
      user: req.session.username,
      errors: null,
    });
  } catch (err) {
    next(err);
  }
};

// POST /aset/:id/update — Update
const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      room_name, room_code, floor, capacity, is_public, building_id,
      asset_name, asset_code, acquisition_type, acquisition_date,
      acquisition_cost, asset_grant_id, condition, status,
    } = req.body;

    const errors = [];
    if (!room_name?.trim())  errors.push('Nama ruangan wajib diisi.');
    if (!room_code?.trim())  errors.push('Kode ruangan wajib diisi.');
    if (!building_id)        errors.push('Gedung wajib dipilih.');
    if (!acquisition_date)   errors.push('Tanggal perolehan wajib diisi.');

    if (errors.length > 0) {
      const aset      = await AsetModel.getById(id);
      const buildings = await AsetModel.getAllBuildings();
      const grants    = await AsetModel.getAllGrants();
      return res.render('aset/edit', {
        title: 'Edit Aset Ruangan',
        aset: { ...aset, ...req.body, id },
        buildings, grants,
        user: req.session.username,
        errors,
      });
    }

    const photo = req.file ? req.file.filename : null;

    // Jika ada foto baru dan ada foto lama, hapus foto lama
    if (photo) {
      const existingData = await AsetModel.getById(id);
      if (existingData && existingData.photo) {
        const oldPath = path.join(__dirname, '../public/uploads/aset', existingData.photo);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
    }

    await AsetModel.update(id, {
      room_name: room_name.trim(),
      room_code: room_code.trim(),
      floor,
      capacity: parseInt(capacity) || 0,
      is_public: is_public === '1',
      building_id: parseInt(building_id),
      asset_name: asset_name.trim(),
      asset_code: asset_code.trim(),
      acquisition_type,
      acquisition_date,
      acquisition_cost: acquisition_cost || null,
      asset_grant_id: asset_grant_id || null,
      condition,
      status,
      photo,
    });

    req.session.flash = { type: 'success', message: `Ruangan "${room_name}" berhasil diperbarui.` };
    res.redirect('/aset');
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      req.session.flash = { type: 'error', message: 'Kode aset ruangan sudah digunakan. Gunakan kode yang berbeda.' };
      return res.redirect(`/aset/${id}/edit`);
    }
    next(err);
  }
};

// POST /aset/:id/delete — Hapus
const destroy = async (req, res, next) => {
  try {
    const { id } = req.params;
    const aset = await AsetModel.getById(id);
    if (!aset) {
      req.session.flash = { type: 'error', message: 'Aset ruangan tidak ditemukan.' };
      return res.redirect('/aset');
    }

    // Hapus file foto jika ada
    if (aset.photo) {
      const filePath = path.join(__dirname, '../public/uploads/aset', aset.photo);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    await AsetModel.destroy(id);
    req.session.flash = { type: 'success', message: `Ruangan "${aset.room_name}" berhasil dihapus.` };
    res.redirect('/aset');
  } catch (err) {
    next(err);
  }
};

// =============================================
//  EXPORT
// =============================================

// GET /aset/export/pdf
const exportPdf = async (req, res, next) => {
  try {
    const q          = req.query.q || '';
    const buildingId = parseInt(req.query.building_id) || 0;
    const asets      = await AsetModel.getAll(q, buildingId);
    const stats      = await AsetModel.getStats();

    const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="laporan-aset-ruangan.pdf"');
    doc.pipe(res);

    doc.fontSize(16).font('Helvetica-Bold').text('Laporan Aset Ruangan', { align: 'center' });
    doc.fontSize(10).font('Helvetica').text('FTI Aset — Sistem Manajemen Aset Ruangan', { align: 'center' });
    doc.fontSize(9).text(`Tanggal Cetak: ${new Date().toLocaleDateString('id-ID', { day:'2-digit', month:'long', year:'numeric' })}`, { align: 'center' });
    doc.moveDown(0.5);
    doc.text(`Total Ruangan: ${stats.total_ruangan}`, { align: 'center' });
    doc.moveDown(1);

    // Tabel
    const cols = [30, 120, 80, 110, 60, 55, 80, 90, 90];
    const headers = ['#', 'Nama Ruangan', 'Kode', 'Gedung', 'Lantai', 'Kapasitas', 'Kondisi', 'Status', 'Perolehan'];
    const startX = 30;
    let y = doc.y;
    const rowH = 20;

    const drawRow = (cols_w, data, isHeader = false) => {
      if (isHeader) doc.rect(startX, y, cols_w.reduce((a, b) => a + b, 0), rowH).fill('#1e293b');
      let x = startX;
      data.forEach((text, i) => {
        doc.rect(x, y, cols_w[i], rowH).stroke();
        doc.font(isHeader ? 'Helvetica-Bold' : 'Helvetica').fontSize(8);
        doc.fillColor(isHeader ? 'white' : 'black');
        doc.text(String(text ?? '-'), x + 3, y + 5, { width: cols_w[i] - 6, lineBreak: false });
        x += cols_w[i];
      });
      doc.fillColor('black');
      y += rowH;
    };

    drawRow(cols, headers, true);
    asets.forEach((a, i) => {
      if (y > 530) { doc.addPage({ layout: 'landscape' }); y = 40; drawRow(cols, headers, true); }
      drawRow(cols, [
        i + 1, a.room_name, a.room_code, a.building_name, a.floor || '-',
        a.capacity, kondisiLabel[a.asset_condition] || a.asset_condition,
        statusLabel[a.asset_status] || a.asset_status,
        perolehanLabel[a.acquisition_type] || a.acquisition_type,
      ]);
    });

    doc.end();
  } catch (err) {
    next(err);
  }
};

// GET /aset/export/docx
const exportDocx = async (req, res, next) => {
  try {
    const q          = req.query.q || '';
    const buildingId = parseInt(req.query.building_id) || 0;
    const asets      = await AsetModel.getAll(q, buildingId);
    const stats      = await AsetModel.getStats();

    const headerCols = ['No', 'Nama Ruangan', 'Kode', 'Gedung', 'Lantai', 'Kapasitas', 'Kondisi', 'Status', 'Perolehan'];
    const headerCells = headerCols.map(text =>
      new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text, bold: true, color: 'FFFFFF', size: 18 })], alignment: AlignmentType.CENTER })],
        shading: { fill: '1e293b' },
      })
    );

    const dataRows = asets.map((a, i) =>
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ text: String(i + 1), alignment: AlignmentType.CENTER })] }),
          new TableCell({ children: [new Paragraph(a.room_name)] }),
          new TableCell({ children: [new Paragraph(a.room_code)] }),
          new TableCell({ children: [new Paragraph(a.building_name)] }),
          new TableCell({ children: [new Paragraph(a.floor || '-')] }),
          new TableCell({ children: [new Paragraph(String(a.capacity))] }),
          new TableCell({ children: [new Paragraph(kondisiLabel[a.asset_condition] || a.asset_condition)] }),
          new TableCell({ children: [new Paragraph(statusLabel[a.asset_status] || a.asset_status)] }),
          new TableCell({ children: [new Paragraph(perolehanLabel[a.acquisition_type] || a.acquisition_type)] }),
        ],
      })
    );

    const document = new Document({
      sections: [{
        children: [
          new Paragraph({ text: 'Laporan Aset Ruangan', heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER }),
          new Paragraph({ text: 'FTI Aset — Sistem Manajemen Aset Ruangan', alignment: AlignmentType.CENTER }),
          new Paragraph({ text: `Tanggal Cetak: ${new Date().toLocaleDateString('id-ID', { day:'2-digit', month:'long', year:'numeric' })}`, alignment: AlignmentType.CENTER }),
          new Paragraph({ text: '' }),
          new Paragraph({ children: [new TextRun({ text: `Total Ruangan: ${stats.total_ruangan}`, bold: true })] }),
          new Paragraph({ text: '' }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({ children: headerCells, tableHeader: true }),
              ...dataRows,
            ],
          }),
        ],
      }],
    });

    const buffer = await Packer.toBuffer(document);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', 'attachment; filename="laporan-aset-ruangan.docx"');
    res.send(buffer);
  } catch (err) {
    next(err);
  }
};

// =============================================
//  REST API
// =============================================

// GET /api/aset
const apiIndex = async (req, res, next) => {
  try {
    const q          = req.query.q || '';
    const buildingId = parseInt(req.query.building_id) || 0;
    const asets      = await AsetModel.getAll(q, buildingId);
    res.json({ success: true, data: asets, total: asets.length });
  } catch (err) {
    next(err);
  }
};

// GET /api/aset/:id
const apiShow = async (req, res, next) => {
  try {
    const aset = await AsetModel.getById(req.params.id);
    if (!aset) return res.status(404).json({ success: false, message: 'Aset ruangan tidak ditemukan.' });
    res.json({ success: true, data: aset });
  } catch (err) {
    next(err);
  }
};

// POST /api/aset
const apiCreate = async (req, res, next) => {
  try {
    const required = ['room_name', 'room_code', 'building_id', 'asset_name', 'asset_code',
                      'acquisition_type', 'acquisition_date', 'condition', 'status'];
    const missing = required.filter(f => !req.body[f]);
    if (missing.length > 0) {
      return res.status(422).json({ success: false, message: `Field wajib kurang: ${missing.join(', ')}` });
    }

    const data = req.body;
    const id = await AsetModel.create({
      room_name: data.room_name.trim(),
      room_code: data.room_code.trim(),
      floor: data.floor || null,
      capacity: parseInt(data.capacity) || 0,
      is_public: data.is_public === true || data.is_public === '1',
      building_id: parseInt(data.building_id),
      asset_name: data.asset_name.trim(),
      asset_code: data.asset_code.trim(),
      acquisition_type: data.acquisition_type,
      acquisition_date: data.acquisition_date,
      acquisition_cost: data.acquisition_cost || null,
      asset_grant_id: data.asset_grant_id || null,
      condition: data.condition,
      status: data.status,
    });
    const aset = await AsetModel.getById(id);
    res.status(201).json({ success: true, message: 'Aset ruangan berhasil dibuat.', data: aset });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: 'Kode aset ruangan sudah digunakan.' });
    }
    next(err);
  }
};

// PUT /api/aset/:id
const apiUpdate = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await AsetModel.getById(id);
    if (!existing) return res.status(404).json({ success: false, message: 'Aset ruangan tidak ditemukan.' });

    const data = req.body;
    await AsetModel.update(id, {
      room_name: (data.room_name || existing.room_name).trim(),
      room_code: (data.room_code || existing.room_code).trim(),
      floor: data.floor !== undefined ? data.floor : existing.floor,
      capacity: data.capacity !== undefined ? parseInt(data.capacity) : existing.capacity,
      is_public: data.is_public !== undefined ? (data.is_public === true || data.is_public === '1') : existing.is_public,
      building_id: parseInt(data.building_id || existing.building_id),
      asset_name: (data.asset_name || existing.asset_name).trim(),
      asset_code: (data.asset_code || existing.asset_code).trim(),
      acquisition_type: data.acquisition_type || existing.acquisition_type,
      acquisition_date: data.acquisition_date || existing.acquisition_date,
      acquisition_cost: data.acquisition_cost !== undefined ? data.acquisition_cost : existing.acquisition_cost,
      asset_grant_id: data.asset_grant_id !== undefined ? data.asset_grant_id : existing.asset_grant_id,
      condition: data.condition || existing.asset_condition,
      status: data.status || existing.asset_status,
    });

    const aset = await AsetModel.getById(id);
    res.json({ success: true, message: 'Aset ruangan berhasil diperbarui.', data: aset });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: 'Kode aset ruangan sudah digunakan.' });
    }
    next(err);
  }
};

// DELETE /api/aset/:id
const apiDelete = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await AsetModel.getById(id);
    if (!existing) return res.status(404).json({ success: false, message: 'Aset ruangan tidak ditemukan.' });
    await AsetModel.destroy(id);
    res.json({ success: true, message: 'Aset ruangan berhasil dihapus.' });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  // Web
  index, create, store, edit, update, destroy,
  // Export
  exportPdf, exportDocx,
  // API
  apiIndex, apiShow, apiCreate, apiUpdate, apiDelete,
};

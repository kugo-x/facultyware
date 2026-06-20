const GedungModel = require('../models/gedungModel');
const PDFDocument = require('pdfkit');
const { Document, Packer, Paragraph, Table, TableRow, TableCell,
        TextRun, AlignmentType, WidthType, HeadingLevel, BorderStyle } = require('docx');

// =============================================
//  WEB VIEWS
// =============================================

// GET /gedung — Daftar gedung + search
const index = async (req, res, next) => {
  try {
    const q = req.query.q || '';
    const flash = req.session.flash || null;
    delete req.session.flash;

    const gedungs = await GedungModel.getAll(q);
    const stats   = await GedungModel.getStats();

    res.render('gedung/index', {
      title: 'Kelola Gedung',
      gedungs,
      stats,
      q,
      flash,
      user: req.session.username,
    });
  } catch (err) {
    next(err);
  }
};

// GET /gedung/create — Form tambah gedung
const create = (req, res) => {
  const flash = req.session.flash || null;
  delete req.session.flash;
  res.render('gedung/create', {
    title: 'Tambah Gedung',
    user: req.session.username,
    flash,
    errors: null,
    old: {},
  });
};

// POST /gedung/store — Simpan gedung baru
const store = async (req, res, next) => {
  try {
    const { name, code, description } = req.body;

    // Validasi sederhana
    const errors = [];
    if (!name || !name.trim()) errors.push('Nama gedung wajib diisi.');
    if (!code || !code.trim()) errors.push('Kode gedung wajib diisi.');

    if (errors.length > 0) {
      return res.render('gedung/create', {
        title: 'Tambah Gedung',
        user: req.session.username,
        errors,
        old: req.body,
      });
    }

    await GedungModel.create({ name: name.trim(), code: code.trim(), description });

    req.session.flash = { type: 'success', message: `Gedung "${name}" berhasil ditambahkan.` };
    res.redirect('/gedung');
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      req.session.flash = { type: 'error', message: 'Kode gedung sudah digunakan. Gunakan kode yang berbeda.' };
      return res.redirect('/gedung/create');
    }
    next(err);
  }
};

// GET /gedung/:id/edit — Form edit gedung
const edit = async (req, res, next) => {
  try {
    const gedung = await GedungModel.getById(req.params.id);
    if (!gedung) {
      req.session.flash = { type: 'error', message: 'Gedung tidak ditemukan.' };
      return res.redirect('/gedung');
    }
    const flash = req.session.flash || null;
    delete req.session.flash;
    res.render('gedung/edit', {
      title: 'Edit Gedung',
      gedung,
      flash,
      user: req.session.username,
      errors: null,
    });
  } catch (err) {
    next(err);
  }
};

// POST /gedung/:id/update — Update gedung
const update = async (req, res, next) => {
  try {
    const { name, code, description } = req.body;
    const { id } = req.params;

    const errors = [];
    if (!name || !name.trim()) errors.push('Nama gedung wajib diisi.');
    if (!code || !code.trim()) errors.push('Kode gedung wajib diisi.');

    if (errors.length > 0) {
      const gedung = await GedungModel.getById(id);
      return res.render('gedung/edit', {
        title: 'Edit Gedung',
        gedung: { ...gedung, ...req.body, id },
        user: req.session.username,
        errors,
      });
    }

    await GedungModel.update(id, { name: name.trim(), code: code.trim(), description });

    req.session.flash = { type: 'success', message: `Gedung "${name}" berhasil diperbarui.` };
    res.redirect('/gedung');
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      req.session.flash = { type: 'error', message: 'Kode gedung sudah digunakan. Gunakan kode yang berbeda.' };
      return res.redirect(`/gedung/${id}/edit`);
    }
    next(err);
  }
};

// POST /gedung/:id/delete — Hapus gedung
const destroy = async (req, res, next) => {
  try {
    const { id } = req.params;
    const gedung = await GedungModel.getById(id);

    if (!gedung) {
      req.session.flash = { type: 'error', message: 'Gedung tidak ditemukan.' };
      return res.redirect('/gedung');
    }

    const masihAdaRuangan = await GedungModel.hasRooms(id);
    if (masihAdaRuangan) {
      req.session.flash = {
        type: 'error',
        message: `Gedung "${gedung.name}" tidak dapat dihapus karena masih memiliki data ruangan.`,
      };
      return res.redirect('/gedung');
    }

    await GedungModel.destroy(id);
    req.session.flash = { type: 'success', message: `Gedung "${gedung.name}" berhasil dihapus.` };
    res.redirect('/gedung');
  } catch (err) {
    next(err);
  }
};

// =============================================
//  EXPORT
// =============================================

// GET /gedung/export/pdf
const exportPdf = async (req, res, next) => {
  try {
    const q = req.query.q || '';
    const gedungs = await GedungModel.getAll(q);
    const stats   = await GedungModel.getStats();

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="laporan-gedung.pdf"');
    doc.pipe(res);

    // Header
    doc.fontSize(18).font('Helvetica-Bold').text('Laporan Daftar Gedung', { align: 'center' });
    doc.fontSize(11).font('Helvetica').text('FTI Aset — Sistem Manajemen Aset Ruangan', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).text(`Tanggal Cetak: ${new Date().toLocaleDateString('id-ID', { day:'2-digit', month:'long', year:'numeric' })}`, { align: 'center' });
    doc.moveDown(1);

    // Statistik ringkas
    doc.fontSize(11).font('Helvetica-Bold').text('Ringkasan:');
    doc.font('Helvetica').fontSize(10);
    doc.text(`• Total Gedung  : ${stats.total_gedung}`);
    doc.text(`• Total Ruangan : ${stats.total_ruangan}`);
    doc.moveDown(1);

    // Tabel header
    const colWidths = [40, 180, 90, 200];
    const startX = 50;
    let y = doc.y;
    const rowH = 22;

    const drawRow = (cols, isBold = false, isHeader = false) => {
      if (isHeader) {
        doc.rect(startX, y, colWidths.reduce((a, b) => a + b, 0), rowH).fill('#1e293b');
        doc.fillColor('white');
      } else {
        doc.fillColor('black');
      }
      let x = startX;
      cols.forEach((text, i) => {
        doc.rect(x, y, colWidths[i], rowH).stroke();
        doc.font(isBold ? 'Helvetica-Bold' : 'Helvetica').fontSize(9);
        doc.fillColor(isHeader ? 'white' : 'black');
        doc.text(String(text), x + 4, y + 6, { width: colWidths[i] - 8, lineBreak: false });
        x += colWidths[i];
      });
      doc.fillColor('black');
      y += rowH;
    };

    drawRow(['#', 'Nama Gedung', 'Kode', 'Deskripsi'], true, true);
    gedungs.forEach((g, i) => {
      if (y > 750) { doc.addPage(); y = 50; drawRow(['#', 'Nama Gedung', 'Kode', 'Deskripsi'], true, true); }
      drawRow([i + 1, g.name, g.code, g.description || '-']);
    });

    doc.end();
  } catch (err) {
    next(err);
  }
};

// GET /gedung/export/docx
const exportDocx = async (req, res, next) => {
  try {
    const q = req.query.q || '';
    const gedungs = await GedungModel.getAll(q);
    const stats   = await GedungModel.getStats();

    const headerCells = ['No', 'Nama Gedung', 'Kode', 'Deskripsi'].map(text =>
      new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text, bold: true, color: 'FFFFFF', size: 20 })], alignment: AlignmentType.CENTER })],
        shading: { fill: '1e293b' },
      })
    );

    const dataRows = gedungs.map((g, i) =>
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ text: String(i + 1), alignment: AlignmentType.CENTER })] }),
          new TableCell({ children: [new Paragraph(g.name)] }),
          new TableCell({ children: [new Paragraph(g.code)] }),
          new TableCell({ children: [new Paragraph(g.description || '-')] }),
        ],
      })
    );

    const doc = new Document({
      sections: [{
        children: [
          new Paragraph({ text: 'Laporan Daftar Gedung', heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER }),
          new Paragraph({ text: 'FTI Aset — Sistem Manajemen Aset Ruangan', alignment: AlignmentType.CENTER }),
          new Paragraph({ text: `Tanggal Cetak: ${new Date().toLocaleDateString('id-ID', { day:'2-digit', month:'long', year:'numeric' })}`, alignment: AlignmentType.CENTER }),
          new Paragraph({ text: '' }),
          new Paragraph({ children: [new TextRun({ text: `Total Gedung: ${stats.total_gedung}   |   Total Ruangan: ${stats.total_ruangan}`, bold: true })] }),
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

    const buffer = await Packer.toBuffer(doc);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', 'attachment; filename="laporan-gedung.docx"');
    res.send(buffer);
  } catch (err) {
    next(err);
  }
};

// =============================================
//  REST API
// =============================================

// GET /api/gedung
const apiIndex = async (req, res, next) => {
  try {
    const q = req.query.q || '';
    const gedungs = await GedungModel.getAll(q);
    res.json({ success: true, data: gedungs, total: gedungs.length });
  } catch (err) {
    next(err);
  }
};

// GET /api/gedung/:id
const apiShow = async (req, res, next) => {
  try {
    const gedung = await GedungModel.getById(req.params.id);
    if (!gedung) return res.status(404).json({ success: false, message: 'Gedung tidak ditemukan.' });
    res.json({ success: true, data: gedung });
  } catch (err) {
    next(err);
  }
};

// POST /api/gedung
const apiCreate = async (req, res, next) => {
  try {
    const { name, code, description } = req.body;
    if (!name || !code) {
      return res.status(422).json({ success: false, message: 'Field name dan code wajib diisi.' });
    }
    const id = await GedungModel.create({ name: name.trim(), code: code.trim(), description });
    const gedung = await GedungModel.getById(id);
    res.status(201).json({ success: true, message: 'Gedung berhasil dibuat.', data: gedung });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: 'Kode gedung sudah digunakan.' });
    }
    next(err);
  }
};

// PUT /api/gedung/:id
const apiUpdate = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, code, description } = req.body;
    const existing = await GedungModel.getById(id);
    if (!existing) return res.status(404).json({ success: false, message: 'Gedung tidak ditemukan.' });
    if (!name || !code) {
      return res.status(422).json({ success: false, message: 'Field name dan code wajib diisi.' });
    }
    await GedungModel.update(id, { name: name.trim(), code: code.trim(), description });
    const gedung = await GedungModel.getById(id);
    res.json({ success: true, message: 'Gedung berhasil diperbarui.', data: gedung });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: 'Kode gedung sudah digunakan.' });
    }
    next(err);
  }
};

// DELETE /api/gedung/:id
const apiDelete = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await GedungModel.getById(id);
    if (!existing) return res.status(404).json({ success: false, message: 'Gedung tidak ditemukan.' });
    const masihAdaRuangan = await GedungModel.hasRooms(id);
    if (masihAdaRuangan) {
      return res.status(409).json({ success: false, message: 'Gedung masih memiliki data ruangan, tidak dapat dihapus.' });
    }
    await GedungModel.destroy(id);
    res.json({ success: true, message: 'Gedung berhasil dihapus.' });
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

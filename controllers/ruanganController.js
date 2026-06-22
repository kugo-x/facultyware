const RuanganModel = require("../models/ruanganModel");
const AsetModel = require("../models/asetModel");
const PDFDocument = require("pdfkit");
const {
  Document,
  Packer,
  Paragraph,
  Table,
  TableRow,
  TableCell,
  TextRun,
  AlignmentType,
  WidthType,
  HeadingLevel,
} = require("docx");
const fs = require("fs");
const path = require("path");

const kondisiLabel = {
  good: "Baik",
  minor_damage: "Rusak Ringan",
  major_damage: "Rusak Berat",
};
const statusLabel = {
  available: "Tersedia",
  in_use: "Digunakan",
  maintenance: "Perbaikan",
  retired: "Pensiun",
};
const perolehanLabel = { procurement: "Pengadaan", grant: "Hibah" };

// =============================================
//  RUANGAN â€” CRUD
// =============================================

const index = async (req, res, next) => {
  try {
    const q = req.query.q || "";
    const buildingId = parseInt(req.query.building_id) || 0;
    const flash = req.session.flash || null;
    delete req.session.flash;

    const ruangans = await RuanganModel.getAll(q, buildingId);
    const stats = await RuanganModel.getStats();
    const buildings = await RuanganModel.getAllBuildings();

    res.render("ruangan/index", {
      title: "Daftar Ruangan",
      ruangans,
      stats,
      buildings,
      q,
      buildingId,
      flash,
      user: req.session.username,
      role: req.session.role || "user",
    });
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const flash = req.session.flash || null;
    delete req.session.flash;
    const buildings = await RuanganModel.getAllBuildings();
    res.render("ruangan/create", {
      title: "Tambah Ruangan",
      buildings,
      flash,
      user: req.session.username,
      role: req.session.role || "user",
      errors: null,
      old: {},
    });
  } catch (err) {
    next(err);
  }
};

const store = async (req, res, next) => {
  try {
    const { room_name, room_code, floor, capacity, is_public, building_id } =
      req.body;

    const errors = [];
    if (!room_name?.trim()) errors.push("Nama ruangan wajib diisi.");
    if (!room_code?.trim()) errors.push("Kode ruangan wajib diisi.");
    if (!building_id) errors.push("Gedung wajib dipilih.");

    if (errors.length > 0) {
      const buildings = await RuanganModel.getAllBuildings();
      return res.render("ruangan/create", {
        title: "Tambah Ruangan",
        buildings,
        errors,
        old: req.body,
        user: req.session.username,
        role: req.session.role || "user",
        flash: null,
      });
    }

    const photo = req.file ? req.file.filename : null;
    await RuanganModel.create({
      room_name: room_name.trim(),
      room_code: room_code.trim(),
      floor,
      capacity: parseInt(capacity) || 0,
      is_public: is_public === "1",
      building_id: parseInt(building_id),
      photo,
    });

    req.session.flash = {
      type: "success",
      message: `Ruangan "${room_name}" berhasil ditambahkan.`,
    };
    res.redirect("/ruangan");
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      req.session.flash = {
        type: "error",
        message: "Kode ruangan sudah digunakan.",
      };
      return res.redirect("/ruangan/create");
    }
    next(err);
  }
};

const edit = async (req, res, next) => {
  try {
    const ruangan = await RuanganModel.getById(req.params.id);
    if (!ruangan) {
      req.session.flash = {
        type: "error",
        message: "Ruangan tidak ditemukan.",
      };
      return res.redirect("/ruangan");
    }
    const flash = req.session.flash || null;
    delete req.session.flash;
    const buildings = await RuanganModel.getAllBuildings();
    res.render("ruangan/edit", {
      title: "Edit Ruangan",
      ruangan,
      buildings,
      flash,
      user: req.session.username,
      role: req.session.role || "user",
      errors: null,
    });
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { room_name, room_code, floor, capacity, is_public, building_id } =
      req.body;

    const errors = [];
    if (!room_name?.trim()) errors.push("Nama ruangan wajib diisi.");
    if (!room_code?.trim()) errors.push("Kode ruangan wajib diisi.");
    if (!building_id) errors.push("Gedung wajib dipilih.");

    if (errors.length > 0) {
      const ruangan = await RuanganModel.getById(id);
      const buildings = await RuanganModel.getAllBuildings();
      return res.render("ruangan/edit", {
        title: "Edit Ruangan",
        ruangan: { ...ruangan, ...req.body, id },
        buildings,
        errors,
        flash: null,
        user: req.session.username,
        role: req.session.role || "user",
      });
    }

    const photo = req.file ? req.file.filename : null;

    // Hapus foto lama jika ada foto baru
    if (photo) {
      const existing = await RuanganModel.getById(id);
      if (existing?.photo) {
        const oldPath = path.join(
          __dirname,
          "../public/uploads/ruangan",
          existing.photo,
        );
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
    }

    await RuanganModel.update(id, {
      room_name: room_name.trim(),
      room_code: room_code.trim(),
      floor,
      capacity: parseInt(capacity) || 0,
      is_public: is_public === "1",
      building_id: parseInt(building_id),
      photo,
    });

    req.session.flash = {
      type: "success",
      message: `Ruangan "${room_name}" berhasil diperbarui.`,
    };
    res.redirect("/ruangan");
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      req.session.flash = {
        type: "error",
        message: "Kode ruangan sudah digunakan.",
      };
      return res.redirect(`/ruangan/${req.params.id}/edit`);
    }
    next(err);
  }
};

const destroy = async (req, res, next) => {
  try {
    const { id } = req.params;
    const ruangan = await RuanganModel.getById(id);
    if (!ruangan) {
      req.session.flash = {
        type: "error",
        message: "Ruangan tidak ditemukan.",
      };
      return res.redirect("/ruangan");
    }

    // Hapus foto jika ada
    if (ruangan.photo) {
      const filePath = path.join(
        __dirname,
        "../public/uploads/ruangan",
        ruangan.photo,
      );
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    // Cascade delete (assets akan terhapus via FK ON DELETE CASCADE)
    await RuanganModel.destroy(id);
    req.session.flash = {
      type: "success",
      message: `Ruangan "${ruangan.room_name}" beserta seluruh asetnya berhasil dihapus.`,
    };
    res.redirect("/ruangan");
  } catch (err) {
    next(err);
  }
};

// =============================================
//  EXPORT RUANGAN
// =============================================

const exportPdf = async (req, res, next) => {
  try {
    const q = req.query.q || "";
    const buildingId = parseInt(req.query.building_id) || 0;
    const ruangans = await RuanganModel.getAll(q, buildingId);
    const stats = await RuanganModel.getStats();

    const doc = new PDFDocument({
      margin: 40,
      size: "A4",
      layout: "landscape",
    });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="laporan-ruangan.pdf"',
    );
    doc.pipe(res);

    doc
      .fontSize(16)
      .font("Helvetica-Bold")
      .text("Laporan Daftar Ruangan", { align: "center" });
    doc
      .fontSize(10)
      .font("Helvetica")
      .text("FTI Aset â€” Sistem Manajemen Aset Ruangan", { align: "center" });
    doc
      .fontSize(9)
      .text(
        `Tanggal Cetak: ${new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })}`,
        { align: "center" },
      );
    doc.moveDown(0.5);
    doc.text(`Total Ruangan: ${stats.total_ruangan}`, { align: "center" });
    doc.moveDown(1);

    const cols = [30, 130, 80, 120, 55, 60, 50, 60];
    const headers = [
      "#",
      "Nama Ruangan",
      "Kode",
      "Gedung",
      "Lantai",
      "Kapasitas",
      "Publik",
      "Jumlah Aset",
    ];
    const startX = 30;
    let y = doc.y;
    const rowH = 20;

    const drawRow = (cols_w, data, isHeader = false) => {
      if (isHeader)
        doc
          .rect(
            startX,
            y,
            cols_w.reduce((a, b) => a + b, 0),
            rowH,
          )
          .fill("#1e293b");
      let x = startX;
      data.forEach((text, i) => {
        doc.rect(x, y, cols_w[i], rowH).stroke();
        doc.font(isHeader ? "Helvetica-Bold" : "Helvetica").fontSize(8);
        doc.fillColor(isHeader ? "white" : "black");
        doc.text(String(text ?? "-"), x + 3, y + 5, {
          width: cols_w[i] - 6,
          lineBreak: false,
        });
        x += cols_w[i];
      });
      doc.fillColor("black");
      y += rowH;
    };

    drawRow(cols, headers, true);
    ruangans.forEach((r, i) => {
      if (y > 530) {
        doc.addPage({ layout: "landscape" });
        y = 40;
        drawRow(cols, headers, true);
      }
      drawRow(cols, [
        i + 1,
        r.room_name,
        r.room_code,
        r.building_name,
        r.floor || "-",
        r.capacity,
        r.is_public ? "Ya" : "Tidak",
        r.jumlah_aset,
      ]);
    });

    doc.end();
  } catch (err) {
    next(err);
  }
};

const exportDocx = async (req, res, next) => {
  try {
    const q = req.query.q || "";
    const buildingId = parseInt(req.query.building_id) || 0;
    const ruangans = await RuanganModel.getAll(q, buildingId);
    const stats = await RuanganModel.getStats();

    const headerCols = [
      "No",
      "Nama Ruangan",
      "Kode",
      "Gedung",
      "Lantai",
      "Kapasitas",
      "Jumlah Aset",
    ];
    const headerCells = headerCols.map(
      (text) =>
        new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({ text, bold: true, color: "FFFFFF", size: 18 }),
              ],
              alignment: AlignmentType.CENTER,
            }),
          ],
          shading: { fill: "1e293b" },
        }),
    );

    const dataRows = ruangans.map(
      (r, i) =>
        new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({
                  text: String(i + 1),
                  alignment: AlignmentType.CENTER,
                }),
              ],
            }),
            new TableCell({ children: [new Paragraph(r.room_name)] }),
            new TableCell({ children: [new Paragraph(r.room_code)] }),
            new TableCell({ children: [new Paragraph(r.building_name)] }),
            new TableCell({ children: [new Paragraph(r.floor || "-")] }),
            new TableCell({ children: [new Paragraph(String(r.capacity))] }),
            new TableCell({ children: [new Paragraph(String(r.jumlah_aset))] }),
          ],
        }),
    );

    const document = new Document({
      sections: [
        {
          children: [
            new Paragraph({
              text: "Laporan Daftar Ruangan",
              heading: HeadingLevel.HEADING_1,
              alignment: AlignmentType.CENTER,
            }),
            new Paragraph({
              text: "FTI Aset â€” Sistem Manajemen Aset Ruangan",
              alignment: AlignmentType.CENTER,
            }),
            new Paragraph({
              text: `Tanggal Cetak: ${new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })}`,
              alignment: AlignmentType.CENTER,
            }),
            new Paragraph({ text: "" }),
            new Paragraph({
              children: [
                new TextRun({
                  text: `Total Ruangan: ${stats.total_ruangan}`,
                  bold: true,
                }),
              ],
            }),
            new Paragraph({ text: "" }),
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: [
                new TableRow({ children: headerCells, tableHeader: true }),
                ...dataRows,
              ],
            }),
          ],
        },
      ],
    });

    const buffer = await Packer.toBuffer(document);
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    );
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="laporan-ruangan.docx"',
    );
    res.send(buffer);
  } catch (err) {
    next(err);
  }
};

// =============================================
//  ASET dalam RUANGAN
// =============================================

const asetIndex = async (req, res, next) => {
  try {
    const { id } = req.params;
    const ruangan = await RuanganModel.getById(id);
    if (!ruangan) {
      req.session.flash = {
        type: "error",
        message: "Ruangan tidak ditemukan.",
      };
      return res.redirect("/ruangan");
    }
    const flash = req.session.flash || null;
    delete req.session.flash;
    const asets = await AsetModel.getByRoomId(id);
    const stats = await AsetModel.getStatsByRoomId(id);

    res.render("ruangan/aset/index", {
      title: `Aset â€” ${ruangan.room_name}`,
      ruangan,
      asets,
      stats,
      flash,
      user: req.session.username,
      role: req.session.role || "user",
      kondisiLabel,
      statusLabel,
      perolehanLabel,
    });
  } catch (err) {
    next(err);
  }
};

const asetCreate = async (req, res, next) => {
  try {
    const { id } = req.params;
    const ruangan = await RuanganModel.getById(id);
    if (!ruangan) {
      req.session.flash = {
        type: "error",
        message: "Ruangan tidak ditemukan.",
      };
      return res.redirect("/ruangan");
    }
    const flash = req.session.flash || null;
    delete req.session.flash;
    const grants = await AsetModel.getAllGrants();

    res.render("ruangan/aset/create", {
      title: `Tambah Aset â€” ${ruangan.room_name}`,
      ruangan,
      grants,
      flash,
      user: req.session.username,
      role: req.session.role || "user",
      errors: null,
      old: {},
    });
  } catch (err) {
    next(err);
  }
};

const asetStore = async (req, res, next) => {
  try {
    const { id } = req.params;
    const ruangan = await RuanganModel.getById(id);
    if (!ruangan) return res.redirect("/ruangan");

    const {
      asset_name,
      asset_code,
      acquisition_type,
      acquisition_date,
      acquisition_cost,
      asset_grant_id,
      condition,
      status,
    } = req.body;

    const errors = [];
    if (!asset_name?.trim()) errors.push("Nama aset wajib diisi.");
    if (!asset_code?.trim()) errors.push("Kode aset wajib diisi.");
    if (!acquisition_type) errors.push("Cara perolehan wajib dipilih.");
    if (!acquisition_date) errors.push("Tanggal perolehan wajib diisi.");
    if (!condition) errors.push("Kondisi wajib dipilih.");
    if (!status) errors.push("Status wajib dipilih.");

    if (errors.length > 0) {
      const grants = await AsetModel.getAllGrants();
      return res.render("ruangan/aset/create", {
        title: `Tambah Aset â€” ${ruangan.room_name}`,
        ruangan,
        grants,
        errors,
        old: req.body,
        user: req.session.username,
        role: req.session.role || "user",
        flash: null,
      });
    }

    await AsetModel.create(id, {
      asset_name,
      asset_code,
      acquisition_type,
      acquisition_date,
      acquisition_cost,
      asset_grant_id,
      condition,
      status,
    });

    req.session.flash = {
      type: "success",
      message: `Aset "${asset_name}" berhasil ditambahkan ke ruangan ini.`,
    };
    res.redirect(`/ruangan/${id}/aset`);
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      req.session.flash = {
        type: "error",
        message: "Kode aset sudah digunakan.",
      };
      return res.redirect(`/ruangan/${req.params.id}/aset/create`);
    }
    next(err);
  }
};

const asetEdit = async (req, res, next) => {
  try {
    const { id, asetId } = req.params;
    const ruangan = await RuanganModel.getById(id);
    if (!ruangan) return res.redirect("/ruangan");
    const aset = await AsetModel.getById(asetId);
    if (!aset || String(aset.room_id) !== String(id)) {
      req.session.flash = { type: "error", message: "Aset tidak ditemukan." };
      return res.redirect(`/ruangan/${id}/aset`);
    }
    const flash = req.session.flash || null;
    delete req.session.flash;
    const grants = await AsetModel.getAllGrants();

    res.render("ruangan/aset/edit", {
      title: `Edit Aset â€” ${aset.asset_name}`,
      ruangan,
      aset,
      grants,
      flash,
      user: req.session.username,
      role: req.session.role || "user",
      errors: null,
    });
  } catch (err) {
    next(err);
  }
};

const asetUpdate = async (req, res, next) => {
  try {
    const { id, asetId } = req.params;
    const ruangan = await RuanganModel.getById(id);
    if (!ruangan) return res.redirect("/ruangan");
    const aset = await AsetModel.getById(asetId);
    if (!aset || String(aset.room_id) !== String(id))
      return res.redirect(`/ruangan/${id}/aset`);

    const {
      asset_name,
      asset_code,
      acquisition_type,
      acquisition_date,
      acquisition_cost,
      asset_grant_id,
      condition,
      status,
    } = req.body;

    const errors = [];
    if (!asset_name?.trim()) errors.push("Nama aset wajib diisi.");
    if (!asset_code?.trim()) errors.push("Kode aset wajib diisi.");
    if (!acquisition_date) errors.push("Tanggal perolehan wajib diisi.");

    if (errors.length > 0) {
      const grants = await AsetModel.getAllGrants();
      return res.render("ruangan/aset/edit", {
        title: `Edit Aset â€” ${aset.asset_name}`,
        ruangan,
        aset: { ...aset, ...req.body, id: asetId },
        grants,
        errors,
        flash: null,
        user: req.session.username,
        role: req.session.role || "user",
      });
    }

    await AsetModel.update(asetId, {
      asset_name,
      asset_code,
      acquisition_type,
      acquisition_date,
      acquisition_cost,
      asset_grant_id,
      condition,
      status,
    });

    req.session.flash = {
      type: "success",
      message: `Aset "${asset_name}" berhasil diperbarui.`,
    };
    res.redirect(`/ruangan/${id}/aset`);
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      req.session.flash = {
        type: "error",
        message: "Kode aset sudah digunakan.",
      };
      return res.redirect(
        `/ruangan/${req.params.id}/aset/${req.params.asetId}/edit`,
      );
    }
    next(err);
  }
};

const asetDestroy = async (req, res, next) => {
  try {
    const { id, asetId } = req.params;
    const aset = await AsetModel.getById(asetId);
    if (!aset || String(aset.room_id) !== String(id)) {
      req.session.flash = { type: "error", message: "Aset tidak ditemukan." };
      return res.redirect(`/ruangan/${id}/aset`);
    }
    await AsetModel.destroy(asetId);
    req.session.flash = {
      type: "success",
      message: `Aset "${aset.asset_name}" berhasil dihapus.`,
    };
    res.redirect(`/ruangan/${id}/aset`);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  // Ruangan
  index,
  create,
  store,
  edit,
  update,
  destroy,
  exportPdf,
  exportDocx,
  // Aset dalam Ruangan
  asetIndex,
  asetCreate,
  asetStore,
  asetEdit,
  asetUpdate,
  asetDestroy,
};

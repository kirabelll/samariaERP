import PDFDocument from 'pdfkit';

interface CompanyInfo {
  name: string;
  tin: string;
  address: string;
  phone: string;
  email: string;
}

const COMPANY: CompanyInfo = {
  name: 'SAMARIA TRADING ONE MEMBER PLC',
  tin: '0012345678',
  address: 'Addis Ababa, Ethiopia',
  phone: '+251 11 123 4567',
  email: 'info@samariatrading.com',
};

function addHeader(doc: PDFKit.PDFDocument, title: string) {
  doc.fontSize(18).font('Helvetica-Bold').text(COMPANY.name, { align: 'center' });
  doc.fontSize(10).font('Helvetica').text(COMPANY.address, { align: 'center' });
  doc.text(`TIN: ${COMPANY.tin} | Phone: ${COMPANY.phone}`, { align: 'center' });
  doc.moveDown(1);
  doc.fontSize(14).font('Helvetica-Bold').text(title, { align: 'center' });
  doc.moveDown(0.5);
  doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
  doc.moveDown(0.5);
}

function addTableRow(doc: PDFKit.PDFDocument, cols: { text: string; width: number; align?: string }[], bold = false) {
  const y = doc.y;
  let x = 50;
  const font = bold ? 'Helvetica-Bold' : 'Helvetica';
  doc.font(font).fontSize(9);

  cols.forEach((col) => {
    doc.text(col.text, x, y, { width: col.width, align: (col.align as any) || 'left' });
    x += col.width;
  });
  doc.moveDown(0.3);
}

export function generateInvoicePDF(invoice: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      addHeader(doc, 'SALES INVOICE');

      // Invoice details
      doc.fontSize(10).font('Helvetica');
      doc.text(`Invoice No: ${invoice.invoiceNo}`, 50);
      doc.text(`Date: ${new Date(invoice.invoiceDate).toLocaleDateString()}`, 50);
      doc.text(`Due Date: ${invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'N/A'}`, 50);
      doc.moveDown(0.5);

      // Customer details
      doc.font('Helvetica-Bold').text('Bill To:');
      doc.font('Helvetica');
      doc.text(invoice.customer?.companyName || 'N/A');
      doc.text(`TIN: ${invoice.customer?.tin || 'N/A'}`);
      doc.text(`Phone: ${invoice.customer?.phone || 'N/A'}`);
      doc.moveDown(1);

      // Items table header
      const itemCols = [
        { text: '#', width: 30 },
        { text: 'Description', width: 200 },
        { text: 'Qty', width: 60, align: 'right' },
        { text: 'Unit Price', width: 80, align: 'right' },
        { text: 'Amount', width: 80, align: 'right' },
      ];

      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(0.3);
      addTableRow(doc, itemCols.map(c => ({ ...c })), true);
      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(0.3);

      // Items
      if (invoice.items && invoice.items.length > 0) {
        invoice.items.forEach((item: any, idx: number) => {
          addTableRow(doc, [
            { text: String(idx + 1), width: 30 },
            { text: item.itemName || item.description || 'Item', width: 200 },
            { text: String(item.quantity || 0), width: 60, align: 'right' },
            { text: Number(item.unitPrice || 0).toLocaleString('en-US'), width: 80, align: 'right' },
            { text: Number(item.amount || item.quantity * item.unitPrice || 0).toLocaleString('en-US'), width: 80, align: 'right' },
          ]);
        });
      }

      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(0.5);

      // Totals
      const rightX = 350;
      doc.font('Helvetica').fontSize(10);
      doc.text(`Subtotal:`, rightX, doc.y, { width: 100, align: 'right' });
      doc.text(`${Number(invoice.subtotalAmount || invoice.totalAmount - invoice.vatAmount || 0).toLocaleString('en-US')} ETB`, rightX + 100, doc.y - 12, { width: 95, align: 'right' });
      doc.moveDown(0.3);
      doc.text(`VAT (15%):`, rightX, doc.y, { width: 100, align: 'right' });
      doc.text(`${Number(invoice.vatAmount || 0).toLocaleString('en-US')} ETB`, rightX + 100, doc.y - 12, { width: 95, align: 'right' });
      doc.moveDown(0.3);
      doc.font('Helvetica-Bold');
      doc.text(`Total:`, rightX, doc.y, { width: 100, align: 'right' });
      doc.text(`${Number(invoice.totalAmount || 0).toLocaleString('en-US')} ETB`, rightX + 100, doc.y - 12, { width: 95, align: 'right' });

      doc.moveDown(2);
      doc.font('Helvetica').fontSize(8).text('This is a computer-generated document.', { align: 'center' });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

export function generateProformaPDF(proforma: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      addHeader(doc, 'PROFORMA INVOICE');

      doc.fontSize(10).font('Helvetica');
      doc.text(`Proforma No: ${proforma.proformaNo}`, 50);
      doc.text(`Date: ${new Date(proforma.proformaDate).toLocaleDateString()}`, 50);
      doc.text(`Valid Until: ${proforma.validUntil ? new Date(proforma.validUntil).toLocaleDateString() : 'N/A'}`, 50);
      doc.moveDown(0.5);

      doc.font('Helvetica-Bold').text('Customer:');
      doc.font('Helvetica');
      doc.text(proforma.customer?.companyName || 'N/A');
      doc.moveDown(1);

      doc.font('Helvetica-Bold').fontSize(12);
      doc.text(`Total Amount: ${Number(proforma.totalAmount || 0).toLocaleString('en-US')} ETB`);
      doc.moveDown(0.5);
      doc.text(`VAT (15%): ${Number(proforma.vatAmount || 0).toLocaleString('en-US')} ETB`);
      doc.moveDown(0.5);
      doc.text(`Grand Total: ${Number((proforma.totalAmount || 0) + (proforma.vatAmount || 0)).toLocaleString('en-US')} ETB`);

      doc.moveDown(2);
      doc.font('Helvetica').fontSize(8).text('This proforma is valid for 30 days from the date of issue.', { align: 'center' });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

export function generatePayrollPDF(payrollPeriod: any, payrollItems: any[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 50, layout: 'landscape' });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      addHeader(doc, `PAYROLL SUMMARY - ${payrollPeriod.periodName}`);

      doc.fontSize(10).font('Helvetica');
      doc.text(`Period: ${new Date(payrollPeriod.startDate).toLocaleDateString()} - ${new Date(payrollPeriod.endDate).toLocaleDateString()}`);
      doc.text(`Pay Date: ${new Date(payrollPeriod.payDate).toLocaleDateString()}`);
      doc.moveDown(1);

      // Table header
      const cols = [
        { text: '#', width: 30 },
        { text: 'Employee', width: 140 },
        { text: 'Basic Salary', width: 80, align: 'right' },
        { text: 'Allowances', width: 80, align: 'right' },
        { text: 'Gross', width: 80, align: 'right' },
        { text: 'Tax', width: 70, align: 'right' },
        { text: 'Pension', width: 70, align: 'right' },
        { text: 'Net Pay', width: 90, align: 'right' },
      ];

      doc.moveTo(50, doc.y).lineTo(745, doc.y).stroke();
      doc.moveDown(0.3);
      addTableRow(doc, cols, true);
      doc.moveTo(50, doc.y).lineTo(745, doc.y).stroke();
      doc.moveDown(0.3);

      payrollItems.forEach((item: any, idx: number) => {
        addTableRow(doc, [
          { text: String(idx + 1), width: 30 },
          { text: item.employeeName || `${item.employee?.firstName || ''} ${item.employee?.lastName || ''}`, width: 140 },
          { text: Number(item.baseSalary || 0).toLocaleString('en-US'), width: 80, align: 'right' },
          { text: Number(item.allowances || 0).toLocaleString('en-US'), width: 80, align: 'right' },
          { text: Number(item.grossSalary || 0).toLocaleString('en-US'), width: 80, align: 'right' },
          { text: Number(item.incomeTax || 0).toLocaleString('en-US'), width: 70, align: 'right' },
          { text: Number(item.pensionEmployee || 0).toLocaleString('en-US'), width: 70, align: 'right' },
          { text: Number(item.netSalary || 0).toLocaleString('en-US'), width: 90, align: 'right' },
        ]);
      });

      doc.moveTo(50, doc.y).lineTo(745, doc.y).stroke();
      doc.moveDown(1);

      doc.font('Helvetica-Bold').fontSize(10);
      doc.text(`Total Gross: ${Number(payrollPeriod.totalGross || 0).toLocaleString('en-US')} ETB`);
      doc.text(`Total Deductions: ${Number(payrollPeriod.totalDeductions || 0).toLocaleString('en-US')} ETB`);
      doc.text(`Total Net Pay: ${Number(payrollPeriod.totalNet || 0).toLocaleString('en-US')} ETB`);

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

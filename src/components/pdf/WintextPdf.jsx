import React from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

import logo from '../../assets/image/winlogo.png';
import logo2 from '../../assets/image/wintel20.png';

const WintextPdf = ({ invoice, onPdfGenerated = () => {}, onError = () => {} }) => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const formatDisplayDate = (dateStr) => {
    if (!dateStr) return '';
    const clean = dateStr.split('T')[0];
    const [year, month, day] = clean.split('-');
    if (!year || !month || !day) return dateStr;
    const monthAbbr = months[parseInt(month, 10) - 1] || month;
    return `${day}-${monthAbbr}-${year}`;
  };

  const formatBDT = (number) => {
    const num = Number(number);
    if (Number.isNaN(num)) return '0.00';
    return num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const numberToWords = (num) => {
    if (num == null || Number.isNaN(Number(num))) return '';
    const n = Math.floor(Number(num));
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];

    const convertHundreds = (x) => {
      if (x === 0) return '';
      if (x < 10) return ones[x];
      if (x < 20) return teens[x - 10];
      if (x < 100) return tens[Math.floor(x / 10)] + (x % 10 !== 0 ? ' ' + ones[x % 10] : '');
      return ones[Math.floor(x / 100)] + ' Hundred' + (x % 100 !== 0 ? ' ' + convertHundreds(x % 100) : '');
    };

    if (n === 0) return 'Zero';
    if (n < 1000) return convertHundreds(n);
    if (n < 100000) {
      const thousands = Math.floor(n / 1000);
      const remainder = n % 1000;
      return convertHundreds(thousands) + ' Thousand' + (remainder !== 0 ? ' ' + convertHundreds(remainder) : '');
    }
    if (n < 10000000) {
      const lakhs = Math.floor(n / 100000);
      let remaining = n % 100000;
      let result = convertHundreds(lakhs) + ' Lakh';
      if (remaining >= 1000) {
        result += ' ' + convertHundreds(Math.floor(remaining / 1000)) + ' Thousand';
        remaining = remaining % 1000;
      }
      if (remaining !== 0) result += ' ' + convertHundreds(remaining);
      return result;
    }
    return n.toString();
  };

  const waitForImagesLoaded = (rootEl, timeout = 5000) => {
    const imgs = Array.from(rootEl.querySelectorAll('img'));
    if (imgs.length === 0) return Promise.resolve();
    let loaded = 0;
    return new Promise((resolve) => {
      const onComplete = () => {
        loaded += 1;
        if (loaded >= imgs.length) resolve();
      };
      imgs.forEach(img => {
        if (img.complete && img.naturalWidth !== 0) {
          onComplete();
        } else {
          const onLoad = () => {
            img.removeEventListener('load', onLoad);
            img.removeEventListener('error', onErrorImg);
            onComplete();
          };
          const onErrorImg = () => {
            img.removeEventListener('load', onLoad);
            img.removeEventListener('error', onErrorImg);
            onComplete();
          };
          img.addEventListener('load', onLoad);
          img.addEventListener('error', onErrorImg);
        }
      });
      setTimeout(() => resolve(), timeout);
    });
  };

  const generatePDF = async () => {
    const printElement = document.getElementById('invoice-print-template');
    if (!printElement) {
      onError("PDF generation element not found");
      return;
    }

    try {
      await waitForImagesLoaded(printElement, 3000);

      const canvas = await html2canvas(printElement, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = 210;
      const pageHeight = 297;
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      const tolerance = 5;
      if (imgHeight <= pageHeight + tolerance) {
        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      } else {
        let heightLeft = imgHeight;
        let position = 0;
        
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        while (heightLeft > 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;
        }
      }

      const fileName = `Invoice_${invoiceData?.invoice_number || 'unknown'}.pdf`;
      pdf.save(fileName);

      onPdfGenerated("PDF generated successfully");
    } catch (error) {
      console.error('Error generating PDF:', error);
      onError("Failed to generate PDF");
    }
  };

  React.useEffect(() => {
    if (invoice) {
      const timeout = setTimeout(() => {
        generatePDF();
      }, 250);
      return () => clearTimeout(timeout);
    }
  }, [invoice]);

  if (!invoice) {
    return null;
  }

  let invoiceData = invoice;
  if (Array.isArray(invoice)) {
    invoiceData = invoice[0];
  }
  
  const details = invoiceData?.wintext_invoice_dtl || [];
  const paymentInstructions = invoiceData?.wintext_inv_pmnt_instr_dtl || [];

  const vatValue = Number(invoiceData.vat || 0);
  const subtotalValue = Number(invoiceData.subtotal || 0);
  const vatPercent = (subtotalValue > 0 && vatValue > 0) ? ((vatValue / subtotalValue) * 100).toFixed(2) : null;

  // Helper function to format note with charge info for MFS
  const getFormattedNote = (payment) => {
    const methodId = payment.payment_method_type_id;
    const isMfs = methodId === 2;
    if (isMfs && payment.txn_charge > 0) {
      return `${payment.txn_charge_text}`;
    }
    return '';
  };

  return (
    <div
      id="invoice-print-template"
      style={{
        position: 'absolute',
        left: '-9999px',
        width: '210mm',
        padding: '25mm 15mm',
        backgroundColor: '#fff',
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: '10pt',
        lineHeight: '1.4',
        color: '#000',
      }}
    >
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{ flex: '0 0 58%' }}>
          <img
            src={logo}
            alt="WINTEL LIMITED"
            style={{ height: '42px', marginBottom: '6px', display: 'block' }}
            crossOrigin="anonymous"
          />
          <p style={{
            margin: '0 0 10px 0',
            fontSize: '7.5pt',
            lineHeight: '1.45',
            color: '#333',
          }}>
            House # 25, Road # 47, Suite # D5 (5th Floor), Gulshan - 02, Dhaka- 1212,<br />
            Bangladesh, Phone: (+8802) 8833463-64, Fax: (+880) 9891510<br />
            Email: info@wintelbd.com, Web: www.wintelbd.com
          </p>

          <p style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: 'bold' }}>
            Receipt No: {invoiceData.invoice_number || ''}
          </p>

          <h3 style={{
            margin: '0 0 6px 0',
            fontSize: '12px',
            fontWeight: 'bold',
            textTransform: 'uppercase',
          }}>BILL TO</h3>

          <div style={{
            width: '68%',
            border: '2px solid #000',
            padding: '7px 9px',
            minHeight: '78px',
          }}>
            <div style={{ fontSize: '8.5pt', lineHeight: '1.5' }}>
              {/* Section (if present) */}
              {invoiceData.section && (
                <div style={{ marginBottom: '2px' }}>{invoiceData.section}</div>
              )}
              
              {/* Client Name */}
              <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>{invoiceData.client_name || ''}</div>
              
              {/* BIN */}
              {invoiceData.bin && (
                <div style={{ marginBottom: '2px' }}>BIN: {invoiceData.bin}</div>
              )}
              
              {/* Address */}
              <div style={{ marginBottom: '2px' }}>{invoiceData.client_address || ''}</div>

              {/* Attention */}
              {invoiceData.billing_attention
                ? <div style={{ marginBottom: '2px' }}>
                    Attn: {invoiceData.billing_attention}
                  </div>
                : invoiceData.kam
                  ? <div style={{ marginBottom: '2px' }}>
                      Attn: {invoiceData.kam}
                    </div>
                  : null
              }
              
              {/* Cell */}
              {invoiceData.billing_attention_phone && (
                <div style={{ marginBottom: '2px' }}>Cell: {invoiceData.billing_attention_phone}</div>
              )}
              
              {/* Email */}
              {invoiceData.client_email && (
                <div style={{ marginBottom: '2px' }}>Email: {invoiceData.client_email}</div>
              )}
            </div>
          </div>
        </div>

        <div style={{
          flex: '0 0 38%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          justifyContent: 'flex-start',
        }}>
          <div>
            <h1 style={{
              margin: '0 0 8px 0',
              fontSize: '13pt',
              fontWeight: 'bold',
              color: '#666',
              letterSpacing: '2px',
            }}>BILL</h1>

            <p style={{
              margin: '0 0 8px 0',
              fontSize: '12px',
              fontWeight: 'bold',
            }}>
              Bill Date: {formatDisplayDate(invoiceData.billing_date)}
            </p>

            {invoiceData.billing_start_date && invoiceData.billing_end_date && (
              <p style={{
                margin: '0 0 8px 0',
                fontSize: '10px',
                textAlign: 'left',
                fontWeight: 'bold',
              }}>
                Billing Period:<br />
                {formatDisplayDate(invoiceData.billing_start_date)} to {formatDisplayDate(invoiceData.billing_end_date)}
              </p>
            )}

            {invoiceData.contract_no && (
              <p style={{
                margin: '0 0 8px 0',
                fontSize: '10px',
                fontWeight: 'bold',
                textAlign: 'left',
              }}>
                Contract No: {invoiceData.contract_no}
              </p>
            )}
          </div>

          <img
            src={logo2}
            alt="20 Years"
            style={{ width: '135px', height: '135px', objectFit: 'contain' }}
            crossOrigin="anonymous"
          />
        </div>
      </div>

      {/* ITEMS TABLE */}
      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        marginBottom: '12px',
        fontSize: '10px',
      }}>
        <thead>
          <tr>
            <th style={{
              padding: '7px 8px',
              textAlign: 'left',
              border: '1px solid #000',
              backgroundColor: '#f5f5f5',
              fontWeight: 'bold',
            }}>DESCRIPTION</th>
            <th style={{
              padding: '7px 8px',
              textAlign: 'center',
              border: '1px solid #000',
              width: '105px',
              backgroundColor: '#f5f5f5',
              fontWeight: 'bold',
            }}>SMS Quantity</th>
            <th style={{
              padding: '7px 8px',
              textAlign: 'right',
              border: '1px solid #000',
              width: '85px',
              backgroundColor: '#f5f5f5',
              fontWeight: 'bold',
            }}>Unit prices</th>
            <th style={{
              padding: '7px 8px',
              textAlign: 'right',
              border: '1px solid #000',
              width: '95px',
              backgroundColor: '#f5f5f5',
              fontWeight: 'bold',
            }}>TOTAL</th>
          </tr>
        </thead>
        <tbody>
          {details && details.length > 0 ? (
            details.map((it, i) => (
              <tr key={i}>
                <td style={{ padding: '7px 8px', border: '1px solid #000', fontSize: '10px' }}>
                  {it.description || ''}
                </td>
                <td style={{ padding: '7px 8px', textAlign: 'center', border: '1px solid #000', fontSize: '10px' }}>
                  {it.sms_qty != null ? formatBDT(it.sms_qty) : ''}
                </td>
                <td style={{ padding: '7px 8px', textAlign: 'right', border: '1px solid #000', fontSize: '10px' }}>
                  {it.unit_price != null ? Number(it.unit_price).toFixed(4) : ''}
                </td>
                <td style={{
                  padding: '7px 8px',
                  textAlign: 'right',
                  border: '1px solid #000',
                  fontWeight: 'bold',
                  fontSize: '10px'
                }}>
                  {it.total != null ? formatBDT(it.total) : ''}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="4" style={{ padding: '7px 8px', border: '1px solid #000', textAlign: 'center', color: '#999' }}>
                No invoice items found
              </td>
            </tr>
          )}

          <tr>
            <td colSpan="1" rowSpan={vatValue > 0 ? "3" : "2"} style={{
              padding: '7px 8px',
              border: '1px solid #000',
              verticalAlign: 'middle',
              textAlign: 'center',
              fontStyle: 'italic',
              fontSize: '10px'
            }}>
              Thank you for your business!
            </td>
            <td colSpan="2" style={{
              padding: '7px 8px',
              textAlign: 'right',
              border: '1px solid #000',
              fontWeight: 'bold',
            }}>SUB TOTAL :</td>
            <td style={{
              padding: '7px 8px',
              textAlign: 'right',
              border: '1px solid #000',
              fontWeight: 'bold',
            }}>
              {formatBDT(invoiceData.subtotal)}
            </td>
          </tr>

          {vatValue > 0 && (
            <tr>
              <td colSpan="2" style={{
                padding: '7px 8px',
                textAlign: 'right',
                border: '1px solid #000',
                fontWeight: 'bold',
              }}>VAT ({vatPercent}%) :</td>
              <td style={{
                padding: '7px 8px',
                textAlign: 'right',
                border: '1px solid #000',
                fontWeight: 'bold',
              }}>
                {formatBDT(invoiceData.vat)}
              </td>
            </tr>
          )}

          <tr>
            <td colSpan="2" style={{
              padding: '7px 8px',
              textAlign: 'right',
              border: '1px solid #000',
              fontWeight: 'bold',
            }}>TOTAL AMOUNT :</td>
            <td style={{
              padding: '7px 8px',
              textAlign: 'right',
              border: '1px solid #000',
              fontWeight: 'bold',
            }}>
              {formatBDT(invoiceData.total)}
            </td>
          </tr>
        </tbody>
      </table>

      {/* IN WORDS */}
      <div style={{ marginBottom: '15px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            <tr>
              <td style={{ width: '70px', fontWeight: 'bold', verticalAlign: 'top', fontSize: '11px' }}>
                In Words :
              </td>
              <td style={{ fontSize: '11px' }}>
                {invoiceData.amount_in_words && invoiceData.amount_in_words !== 'Amount in words'
                  ? invoiceData.amount_in_words
                  : `${numberToWords(Math.floor(Number(invoiceData.total || 0)))} Taka Only.`}
              </td>
            </tr>
          </tbody>
        </table>
        <p style={{
          margin: '6px 0 0 0',
          fontSize: '8pt',
          fontStyle: 'italic',
        }}>{invoiceData.note || 'Note: Inclusive of all charges.'}</p>
      </div>

      {/* PAYMENT INSTRUCTIONS */}
      <div style={{
        border: '2px solid #000',
        padding: '10px 12px',
        marginBottom: '60px',
      }}>
        <h3 style={{
          margin: '0 0 6px 0',
          fontSize: '9.5pt',
          fontWeight: 'bold',
        }}>Payment Instructions:</h3>
        <p style={{
          margin: '0 0 10px 0',
          fontSize: '8.5pt',
          lineHeight: '1.5',
        }}>
          Please issue cheque in favor of <strong>"{invoiceData?.company_info?.name || 'WINTEL LIMITED'}"</strong> or make fund transfer or deposit to following account{paymentInstructions.length > 1 ? 's' : ''}.
        </p>

        {paymentInstructions && paymentInstructions.length > 0 ? (
          <div style={{
            border: '1px solid #000',
            padding: '8px 10px',
            backgroundColor: '#f9f9f9',
          }}>
            <h4 style={{
              margin: '0 0 5px 0',
              fontSize: '10px',
              fontWeight: 'bold',
              textDecoration: 'underline'
            }}>
              Bank Details:
            </h4>
            
            <table style={{ width: '100%', fontSize: '8.5pt', borderCollapse: 'collapse' }}>
              <tbody>
                {paymentInstructions.map((payment, index) => {
                  const methodId = payment.payment_method_type_id;
                  const isBank = methodId === 1;
                  const isMfs = methodId === 2;

                  if (isBank) {
                    return (
                      <tr key={index}>
                        <td style={{ padding: '2px 0', whiteSpace: 'nowrap' }}>
                          {payment.pmnt_rcv_bank || 'N/A'}
                        </td>
                        <td style={{ padding: '2px 8px' }}>|</td>
                        <td style={{ padding: '2px 0' }}>
                          A/C: {payment.pmnt_receive_acc || 'N/A'}
                        </td>
                        <td style={{ padding: '2px 8px' }}>|</td>
                        <td style={{ padding: '2px 0' }}>
                          {payment.pmnt_rcv_branch || 'N/A'}
                        </td>
                        <td style={{ padding: '2px 8px' }}>|</td>
                        <td style={{ padding: '2px 0' }}>
                          RN:{payment.pmnt_rcv_rn || 'N/A'}
                        </td>
                      </tr>
                    );
                  }

                  if (isMfs) {
                    return (
                      <tr key={index}>
                        <td style={{ padding: '2px 0' }}>
                          {payment.mfs_type?.mfs_name || 'MFS'}
                        </td>
                        <td style={{ padding: '2px 8px' }}>|</td>
                        <td style={{ padding: '2px 0' }}>
                          {payment.receiver_name || 'N/A'}
                        </td>
                        <td style={{ padding: '2px 8px' }}>|</td>
                        <td style={{ padding: '2px 0', whiteSpace: 'nowrap' }}>
                          {payment.pmnt_receive_acc || 'N/A'}
                        </td>
                        <td style={{ padding: '2px 8px' }}>|</td>
                        <td style={{ padding: '2px 0' }}>
                          {payment.merchant_type || 'Merchant'}
                        </td>
                        <td style={{ padding: '2px 8px' }}>|</td>
                        <td style={{ padding: '2px 0', fontStyle: 'italic' }}>
                          {getFormattedNote(payment)}
                        </td>
                      </tr>
                    );
                  }

                  return null;
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ fontSize: '8.5pt', color: '#666', fontStyle: 'italic' }}>
            No payment instructions available
          </div>
        )}
      </div>

      {/* SIGNATURES */}
      <div style={{ marginTop: '80px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            <tr>
              <td style={{ width: '33%', textAlign: 'center', verticalAlign: 'bottom', paddingTop: '50px' }}>
                <div style={{
                  borderTop: '1px solid #000',
                  width: '80%',
                  margin: '0 auto',
                  paddingTop: '4px',
                  fontSize: '8pt',
                }}>Prepared by</div>
                <div style={{ fontWeight: 'bold', fontSize: '11px', marginTop: '2px' }}>
                  {invoiceData.prepared_by || ''}
                </div>
              </td>

              <td style={{ width: '33%', textAlign: 'center', verticalAlign: 'bottom', paddingTop: '50px' }}>
                <div style={{
                  borderTop: '1px solid #000',
                  width: '80%',
                  margin: '0 auto',
                  paddingTop: '4px',
                  fontSize: '8pt',
                }}>Checked by</div>
                <div style={{ fontWeight: 'bold', fontSize: '11px', marginTop: '2px' }}>
                  {invoiceData.kam || 'Riaz Mohsin'}
                </div>
              </td>

              <td style={{ width: '33%', textAlign: 'center', verticalAlign: 'bottom', paddingTop: '50px' }}>
                <div style={{
                  borderTop: '1px solid #000',
                  width: '80%',
                  margin: '0 auto',
                  paddingTop: '4px',
                  fontSize: '8pt',
                }}>Received by</div>
                <div style={{ fontWeight: 'bold', fontSize: '11px', marginTop: '2px' }}>
                  {invoiceData.received_by || ''}
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default WintextPdf;
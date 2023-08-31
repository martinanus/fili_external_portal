const formId                            = '1KNc85dALaVtw4ffHUxVdbFS81HcSxSxhOF5vob-t6qk';

const transactionTypeQuestionTitle      = "Indique su relación con SIP";
const clientChoice                      = "Soy Cliente - Quiero cargar un comprobante de pago para SIP";
const providerChoice                    = "Soy Proveedor - Quiero cargar una factura para SIP";

const cuitQuestionTitle                 = "Indique su CUIT";

const paymentReceiptQuestionTitle       = "Adjunte el comprobante de pago aquí"

const invoiceQuestionTitle              = "Adjunte la factura aquí"

const customMailContentQuestionTitle    = "En caso de querer hacer algún comentario o aclaración para SIP, escriba a continuación"

const bqProjectId                       = 'fili-377220';
const bqDataset                         = 'fili_sandbox'

const bqInvoicePaymentsTableName        = 'ip_01_invoices_and_payments_t'
const bqCrmTableName                    = 'i_00_counterpart_upload_ext'

const userEmail                         = "anusmartin1@gmail.com"
const filiWebSiteUrl                    = "www.somosfili.com"



function sendInvoiceToUser(){

    var form = FormApp.openById(formId);
    var formResponses = form.getResponses();
    var formResponse = formResponses[formResponses.length - 1]

    var itemResponses = formResponse.getItemResponses();

    for (var j = 0; j < itemResponses.length; j++) {
        let itemResponse = itemResponses[j];
        let title        = itemResponse.getItem().getTitle();
        if (title == transactionTypeQuestionTitle){
            var transactionType = itemResponse.getResponse();
            Logger.log('Transaction type : "%s"', transactionType)
            if (transactionType == clientChoice){
                var transactionType = "Client";
            } else if (transactionType == providerChoice){
                var transactionType = "Provider";
            }
            Logger.log('Transaction Type is : "%s"', transactionType)
        } else if (title == cuitQuestionTitle) {
            var cuit = itemResponse.getResponse();
            Logger.log('CUIT is : "%s"', cuit)
        } else if ((title == paymentReceiptQuestionTitle) || (title == invoiceQuestionTitle)){
            var documents = itemResponse.getResponse();
            Logger.log('Documents to attach Id: "%s"', documents);
        } else if (title == customMailContentQuestionTitle){
            var customMailContent = itemResponse.getResponse();
            Logger.log('Custom mail content: "%s"', customMailContent)
        }
    }

    uploadAttachedFiles(documents, transactionType);



    var respondantEmail = "";
    var counterpartName = getCounterpartName(cuit);

    if (counterpartName){
        respondantEmail = formResponse.getRespondentEmail();
        Logger.log('Respondant email: "%s"', respondantEmail)
        Logger.log('Contraparte de ALTA')
    } else{
        Logger.log('NO SE ENCONTRÖ CONTRAPART')
        counterpartName = "Contraparte Desconocida"
    }

    /* TODO
     rewrite email and question in forms
     separate client from provider in wording and unknown counterpart
    */
    sendEmailToUser(counterpartName, respondantEmail, documents, customMailContent)
}


function getCounterpartName(cuit) {
    const query = 'SELECT counterpart FROM '
                 + '`' + bqProjectId + '.' + bqDataset + '.' + bqCrmTableName + '`'
                 +'WHERE (CUIT = "' + cuit  + '")'

    var rows = runQuery(query)

    var data = rowsToList(rows)

    return data[0];
}



function sendEmailToUser(counterpartName, respondantEmail, documents, customMailContent){

    var subject     = `Nueva carga en el portal externo de ` + counterpartName ;
    var body        = getEmailBody(customMailContent, counterpartName);
    var attachment  = getAttachmentsFromFileIds(documents);

    GmailApp.sendEmail(userEmail, subject, '', {
      cc          : respondantEmail,
      htmlBody    : body,
      attachments : attachment,
    })

    Logger.log("Se notificó al usuario con copia a la contraparte ");

}


function getAttachmentsFromFileIds(fileIds){
    blobList = [];
    for (var i = 0; i < fileIds.length; i++) {
        let file = DriveApp.getFileById(fileIds[i]);
        blobList.push(file.getBlob());
    }
    return blobList;
}

function getEmailBody(customMailContent, counterpartName){
    var emoji_html = "&#128075;"
    var body = `Hola ${emoji_html}, <BR><BR>`
            + `Se cargó un nuevo documento en el Portal Externo por ` + counterpartName + ` <BR><BR>`

    if (counterpartName == "Contraparte Desconocida"){
        body += 'La contraparte NO está dada de alta en el sistema. Le solicitamos '
        body += 'por favor que realice el alta para contar con los datos de la contraparte <BR><BR>'
    }

    if (customMailContent){
        body += 'En la carga se realizó la siguiente aclaración: <BR><BR>"'
        body += customMailContent.replaceAll("\n", "<BR>");
        body += '"<BR><BR>'
    }

    body  += `Ajunto encontrarás el documento cargado.<BR><BR>`
                + `¡Muchas gracias! <BR><BR>`
                + `El equipo de Fili.`;

    body += getFiliUrlWithUtm(counterpartName);

    return body;

}

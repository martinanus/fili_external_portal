const formId                            = '1YocH8KSWLuhszqMm0pGfrips6U65kxsQL9JSrkWepKQ';

const transactionTypeQuestionTitle      = "Indique su relación con SIP";
const clientChoice                      = "Soy Cliente - Quiero cargar un comprobante de pago para SIP";
const providerChoice                    = "Soy Proveedor - Quiero cargar una factura para SIP";

const cuitQuestionTitle                 = "Indique el CUIT de su empresa";

const paymentReceiptQuestionTitle       = "Adjunte el comprobante de pago aquí"

const invoiceQuestionTitle              = "Adjunte la factura aquí"

const customMailContentQuestionTitle    = "En caso de querer hacer algún comentario o aclaración para SIP, escriba a continuación"

const bqProjectId                       = 'fili-377220';
const bqDataset                         = 'fili_sandbox' // TODO - Update this

const bqInvoicePaymentsTableName        = 'ip_01_invoices_and_payments_t'
const bqCrmTableName                    = 'i_00_counterpart_upload_ext'

const userEmail                         = "anusmartin1@gmail.com" // TODO - Update this
const filiWebSiteUrl                    = "www.somosfili.com"
const internalEmail                     = "soporte@somosfili.com"



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

    var counterpartName = getCounterpartName(cuit);

    sendEmailToUser(counterpartName, documents, customMailContent, transactionType, formResponse, cuit)
}


function getCounterpartName(cuit) {
    const query = 'SELECT counterpart FROM '
                 + '`' + bqProjectId + '.' + bqDataset + '.' + bqCrmTableName + '`'
                 +'WHERE (CUIT = "' + cuit  + '")'

    var rows = runQuery(query)

    var data = rowsToList(rows)

    if (!data[0]){
        return "Contraparte Desconocida";
    }

    return data[0];
}

function sendEmailToUser(counterpartName, documents, customMailContent, destination, formResponse, cuit){

    var subject         = getSubject(counterpartName, destination)
    var body            = getEmailBody(customMailContent, counterpartName, destination, cuit);
    var attachment      = getAttachmentsFromFileIds(documents);
    var respondantEmail = getRespondentEmail(counterpartName, formResponse);

    GmailApp.sendEmail(userEmail, subject, '', {
      cc          : respondantEmail,
      bcc         : internalEmail,
      htmlBody    : body,
      attachments : attachment,
    })

    Logger.log("Se notificó al usuario con copia a la contraparte ");

}


function getSubject(selectedCounterpart, destination){
    var clientSubject     = `Nuevo Comprobante de pago cargado por ` + selectedCounterpart;
    var providerSubject   = `Nueva Factura cargada por ` + selectedCounterpart;

    if (destination == "Client"){
        return clientSubject;
    } else {
        return providerSubject;
    }
}

function getRespondentEmail(counterpartName, formResponse){
    if (counterpartName == "Contraparte Desconocida" ){
        return "";
    }
    return formResponse.getRespondentEmail();
}

function getEmailBody(customMailContent, counterpartName, destination, cuit){
    var emoji_html = "&#128075;"
    var documentType;
    if (destination == "Client"){
        documentType = "un nuevo comprobante de pago "
    } else {
        documentType = "una nueva factura "
    }

    var body = `Hola ${emoji_html}, <BR><BR>`
                + `Se cargó ` + documentType + `en el Portal de Carga Externo`;

    if (counterpartName != "Contraparte Desconocida"){
        body += ` por parte de ` + counterpartName + ` <BR><BR>`
    } else {
        body += `. <BR>La contraparte identificada con el CUIT ${cuit} NO está dada de alta en el sistema. Le solicitamos `
        body += 'por favor que realice el alta para contar con los datos de la contraparte <BR><BR>'
    }

    if (customMailContent){
        body += 'En la carga se realizó la siguiente aclaración: <BR><BR>"'
        body += customMailContent.replaceAll("\n", "<BR>");
        body += '"<BR><BR>'
    }

    body +=  `Ajunto encontrarás el documento cargado.<BR><BR>`
                    + `¡Muchas gracias! <BR><BR>`
                    + `El equipo de Fili.`;

    body += getFiliUrlWithUtm(counterpartName);

    return body;

}

function getAttachmentsFromFileIds(fileIds){
    blobList = [];
    for (var i = 0; i < fileIds.length; i++) {
        let file = DriveApp.getFileById(fileIds[i]);
        blobList.push(file.getBlob());
    }
    return blobList;
}
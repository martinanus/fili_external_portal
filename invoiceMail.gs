const formId                            = '1IuV1P_2as87p2vFy9DcD8hMJ1j_UEMH5IsuXWjRdNws';


const idQuestionTitle                 = "Please indicate the ID of your company (CUIT / SIRET)";
const invoiceQuestionTitle              = "Please attach your invoice here"
const customMailContentQuestionTitle    = "If you want to add any comment to the upload, please write it here"

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
        if (title == idQuestionTitle) {
            var id = itemResponse.getResponse();
            Logger.log('ID is : "%s"', id)
        } else if (title == invoiceQuestionTitle){
            var documents = itemResponse.getResponse();
            Logger.log('Documents to attach Id: "%s"', documents);
        } else if (title == customMailContentQuestionTitle){
            var customMailContent = itemResponse.getResponse();
            Logger.log('Custom mail content: "%s"', customMailContent)
        }
    }

    uploadAttachedFiles(documents);

    var counterpartName = getCounterpartName(id);

    sendEmailToUser(counterpartName, documents, customMailContent, formResponse, id)
}


function getCounterpartName(id) {
    const query = 'SELECT counterpart FROM '
                 + '`' + bqProjectId + '.' + bqDataset + '.' + bqCrmTableName + '`'
                 +'WHERE (CUIT = "' + id  + '")'

    var rows = runQuery(query)

    var data = rowsToList(rows)

    if (!data[0]){
        return "Unknown Counterpart";
    }

    return data[0];
}

function sendEmailToUser(counterpartName, documents, customMailContent, formResponse, id){

    var subject         = getSubject(counterpartName)
    var body            = getEmailBody(customMailContent, counterpartName, id);
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


function getSubject(selectedCounterpart){
    var providerSubject   = `New invoice loaded by ` + selectedCounterpart;

    return providerSubject;
}

function getRespondentEmail(counterpartName, formResponse){
    if (counterpartName == "Unknown Counterpart" ){
        return "";
    }
    return formResponse.getRespondentEmail();
}

function getEmailBody(customMailContent, counterpartName, id){
    var emoji_html = "&#128075;"

    var body = `Hello ${emoji_html}, <BR><BR>`
                + `A new invoice has been uploaded in the Invoice Loading Portal`;

    if (counterpartName != "Unknown Counterpart"){
        body += ` by ` + counterpartName + ` <BR><BR>`
    } else {
        body += `. <BR>The counterpart with ID ${id} is NOT registered in the system. Please `
        body += 'add this counterpart to have all the relative information. <BR><BR>'
    }

    if (customMailContent){
        body += 'In the Portal, the following comment has been done: <BR><BR>"'
        body += customMailContent.replaceAll("\n", "<BR>");
        body += '"<BR><BR>'
    }

    body +=  `Attached you will find the uploaded invoice.<BR><BR>`
                    + `Thanks and have a good day! <BR><BR>`
                    + `Fili's Team.`;

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
function rowsToList(rows, noDataMsg){
    if (!rows) {
        var dataNoOption = [noDataMsg]
        return dataNoOption;
    }

    var data = new Array(rows.length);

    for (let i = 0; i < rows.length; i++) {
        const cols = rows[i].f;
        for (let j = 0; j < cols.length; j++) {
            data[i] = cols[j].v;
        }
    }

    data = [... new Set(data)] // remove duplicated options

    return data;
}

function runQuery(query){

    const request = {
        query: query,
        useLegacySql: false
    };
    let queryResults = BigQuery.Jobs.query(request, bqProjectId);
    const jobId = queryResults.jobReference.jobId;


    // Check on status of the Query Job.
    let sleepTimeMs = 500;
    while (!queryResults.jobComplete) {
        Utilities.sleep(sleepTimeMs);
        sleepTimeMs *= 2;
        queryResults = BigQuery.Jobs.getQueryResults(bqProjectId, jobId);
    }

    // Get all the rows of results.
    let rows = queryResults.rows;
    while (queryResults.pageToken) {
        queryResults = BigQuery.Jobs.getQueryResults(bqProjectId, jobId, {
            pageToken: queryResults.pageToken
        });
        rows = rows.concat(queryResults.rows);
    }

    if (!rows) {
        console.log('No rows returned on query: \n' + query);
        return;
    }

    return rows;

}


function getFiliUrlWithUtm(client){
    var userHashed = hash_str(bqDataset)
    var clientHashed = hash_str(client)

    var UrlWithUtm = filiWebSiteUrl+"?utm_source=fact&utm_medium=mail&utm_campaign="+userHashed
    UrlWithUtm += "&utm_content="+clientHashed

    console.log("UrlWithUtm: " + UrlWithUtm);

    var htmlText = `<BR><a href=${UrlWithUtm}><font size="-2">Sent with Fili</font></a>`

    return htmlText
}


function hash_str(str_to_hash){
    let sum = 0;

    for (let i = 0; i < str_to_hash.length; i++) {
      sum += str_to_hash.charCodeAt(i);
    }
    sum *= str_to_hash.charCodeAt(0);

    return sum;
  }


function uploadAttachedFiles(document){
    var destinationFolderId = searchFolderId("Pagos")

    makeFilesCopy(document, destinationFolderId);

}

function makeFilesCopy(fileIds, destination){
    for (var i = 0; i < fileIds.length; i++) {
        copyFileToFolder(fileIds[i], destination);
    }
}

function copyFileToFolder(fileId, folderId){
    const file = DriveApp.getFileById(fileId);
    const destination = DriveApp.getFolderById(folderId);
    const copiedFile = file.makeCopy(destination);
    console.log("File: " + copiedFile.getName() + " copied to: " + destination.getName());
}



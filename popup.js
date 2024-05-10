const setupButton = document.getElementById('setupButton');
const outUrl = document.getElementById('outUrl');
const msgText = document.getElementById('msg');

let tabs = await messenger.tabs.query({ active: true, currentWindow: true });
let message = await messenger.messageDisplay.getDisplayedMessage(tabs[0].id);
const attachments = await messenger.messages.listAttachments(message.id);
const attachmentFiles = await Promise.all(attachments.map(async attachment => {
    return await messenger.messages.getAttachmentFile(message.id, attachment.partName);
}));

const config = (await messenger.storage.local.get('paperless')).paperless;


setupButton.onclick = async () => {
    await messenger.tabs.create({
        url: 'settings.html'
    });
};


if (attachmentFiles.length === 0) {
    msgText.innerText = 'No attachments found';
}

if (config?.token && config?.host) {
    outUrl.href = `${config?.host}/tasks`;
    setupButton.style.display = 'none';

    const headers = new Headers();
    headers.set('Authorization', `Token ${config?.token}`);


    // Get correspondents
    const res = await fetch(`${config?.host}/api/correspondents/`, {
        method: 'GET',
        headers,
    });
    const data = await res.json();
    let corr_id = -1;
    for (let correspondent of data['results']) {
        if (correspondent['name'].toLowerCase() == message.author.toLowerCase()) {
            corr_id = correspondent['id']
        }
    }
    if (corr_id == -1) {
        const new_correspondent = new FormData()
        new_correspondent.append('name', message.author);
        const response = await fetch(`${config?.host}/api/correspondents/`, {
            method: 'POST',
            headers,
            body: new_correspondent
        });
        const response_text = await response.json();
        corr_id = response_text['id'];
    }


    try {
        for (let file of attachmentFiles) {
            const data = new FormData()
            data.append('document', file);
            data.append('title', file.name);
            data.append('correspondent', corr_id)

            await fetch(`${config?.host}/api/documents/post_document/`, {
                method: 'POST',
                headers,
                body: data
            });
        }
    } catch (e) {
        msgText.innerText = e;
    }


} else {
    msgText.innerText = 'Please setup your instance';
    outUrl.style.display = 'none';
    setupButton.style.display = 'block';
}





async function run() {
    try {
        console.log('Fetching tickets from old project (assistenza-sk) without auth...');
        const res = await fetch('https://firestore.googleapis.com/v1/projects/assistenza-sk/databases/(default)/documents/tickets?pageSize=5');
        console.log('Status:', res.status);
        const data = await res.json();
        console.log('Data:', JSON.stringify(data, null, 2));
    } catch (e) {
        console.error('Error:', e);
    }
}
run();

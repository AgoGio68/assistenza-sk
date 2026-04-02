fetch('https://firestore.googleapis.com/v1/projects/assistenza-sk-official/databases/(default)/documents/settings/global')
  .then(r => r.json())
  .then(d => {
    console.log("SK:", d.fields.installationsSheetUrl?.stringValue);
    console.log("S2:", d.fields.section2InstallationsSheetUrl?.stringValue);
  })
  .catch(console.error);

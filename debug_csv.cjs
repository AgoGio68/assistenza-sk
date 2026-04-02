const fs = require('fs');
fetch('https://docs.google.com/spreadsheets/d/1-_fsFN0urDm9ESh80ic4zh9HiLstYTaSD_3yJg-RRbE/export?format=csv&gid=1536909093')
  .then(res => res.text())
  .then(csv => {
      const rows = csv.split('\n');
      console.log(`Total rows: ${rows.length}`);
      rows.forEach((row, i) => {
          if (row.toLowerCase().includes('smell')) {
              console.log(`Found at real line ${i + 1}: ${row}`);
              // Simuliamo parseCSV
              const parts = row.split(',').map(p => p.replace(/"/g, '').trim());
              let detectedRowIndex = '';
              for (let j = parts.length - 1; j >= 9; j--) {
                  const val = (parts[j] || '').trim();
                  if (val && /^\\d+$/.test(val)) {
                      detectedRowIndex = val;
                      break;
                  }
              }
              if (!detectedRowIndex) detectedRowIndex = (i + 1).toString(); // i+1 nel vero csv = index+2 nel codice (perchè ignora header)
              console.log(`[DEBUG] parseCSV detectedRowIndex sarebbe: ${detectedRowIndex}`);
          }
      });
  });


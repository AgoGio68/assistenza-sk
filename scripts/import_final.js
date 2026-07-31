import { initializeApp } from 'firebase/app';
import { getFirestore, doc, updateDoc } from 'firebase/firestore';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const firebaseConfig = {
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.VITE_FIREBASE_APP_ID
};

const csvData = `Ordine,Cliente,Macchina,Installazione,Data,Modello SK,Matricola SK,Data Install.,Commenti,Note Installazioni,,
027961,Atibaia,?,?,01/09/2023,SK4.10,,,sembra annullato,,quando fatturo inserire in data fatturato,
027962,Atibaia,?,?,01/10/2023,SK4.10,,,sembra annullato,,,gdgsgsg
61,MIMEAF,Doppio colpo,Cliente,01/02/2024,SK4.10,,,da fare,,,
XX350124,Frankfort,SP combinata,Sacma,03/07/2024,SK4.10 4STAMP.+2,,,da fare,,,
ZP64279,Camcar,RP320,Ingramatic,01/02/2025,SK4.10 3pads + DMI,,,da fare,,,
4500111946,Fontana dest. Zoate,SP27,Cliente,01/04/2025,SK4.10 2+2+2,,,da fare,,,
4500112064,Fontana dest. Zoate,SP27,Cliente,20/05/2025,SK4.10 2+2+2,,,da fare,,,
2500573,Milani,macchina 020,Cliente,01/06/2025,SK4.10,,,da fare,,,
2500573,Milani,macchina 012,Cliente,01/06/2025,SK4.10,,,da fare,,,
2500573,Milani,macchina 010,Cliente,01/06/2025,SK4.10,,,da fare,,,
2500573,Milani,macchina 002,Cliente,01/06/2025,SK4.10, ,,da fare,,,
2500573,Milani,macchina 001,Cliente,01/06/2025,SK4.10,,,da fare,,,
XX200393,Sterling,RP520 R1,Ingramatic,01/07/2025,SK4.10 3pads + DMI,,,da fare,,,
XX200545,Sterling,RP620R1,Ingramatic,17/09/2025,SK4.10 3pads + DMI,,,da fare,,,
XX200544,Sterling,RP520,Ingramatic,17/09/2025,SK4.10 3pads + DMI,,,da fare,,,
Mail 24/10,Lomges,Nuovaceva,Cliente,15/11/2025,SK4.10 5st.,,,da fare,,,
ZP66680,Camcar,KSP12,Sacma,15/12/2025,SK4.10 2SENS.  ,,,da fare,,,
035054,Atibaia,RP420 R2,Ingramatic,01/01/2026,SK4.10 3pads + DMI,,,20/01/2026,,,
035055,Atibaia,RP420 R2,Ingramatic,01/01/2026,SK4.10 3pads + DMI,,,da fare,,,
DA ELIMINARE,LOBO,SP28,Sacma,15/02/2026,SK4.10 2stamp.+2Rul,Sk4.10-026OSH0070,08/04/2026,Da eliminare,,,
035058,Atibaia,RP320,Ingramatic,01/03/2026,SK4.10 3pads + DMI,Sk4.10-026OSH0,16/03/2026,[DA COLLAUDARE],,,
035057,Atibaia,RP320,Ingramatic,01/03/2026,SK4.10 3pads + DMI,,,da fare,,,
035056,Atibaia,RP520 R2,Ingramatic,01/03/2026,SK4.10 3pads + DMI,,,da fare,,,
1010419105,IBS ,SP28 ,Sacma,03/03/2026,SK4.10 2+2,,,da fare,,,
52308,SBE MONFALCONE,Filettatrice 12/12,CLiente,12/03/2026,SK4.10 3 sens. DMI,,,da fare,,,
52308,SBE MONFALCONE,Filettatrice 12/15,CLiente,12/03/2026,SK4.10 3 sens. DMI,,,da fare,,,
SOLO INSTALL.,Friedberg/Marposs,TLM RP27,TLM,20/03/2026,SK5.12 3CH,Sk5.12-O26SH0090,01/04/2026,[COLLAUDATA],,,
SOLO INSTALL.,Rivex/Eric,SP370,SACMA,20/03/2026,SK4.10 6CH,,08/04/2026,da finire,,,
1026,SMEL,SP360,Cliente,25/03/2026,SK5.12 5 staz.,,,da fare,,,
06/02/2026,Milani,macchina 540,Cliente,30/03/2026,SK200T,,,da fare,,,
2601579,DA-TOR,LIAN SHYANG 118.1,Cliente,31/03/2026,SK4.10 6CH,,,da fare,,,
06/02/2026,Milani,macchina 620,Cliente,31/03/2026,SK4.10,,,da fare,,,
06/02/2026,Milani,macchina 651,Cliente,01/04/2026,SK4.10,,,da fare,,,
06/02/2026,Milani,macchina 652,Cliente,02/04/2026,SK400 LORO,,,da fare,,,
SOLO INSTALL.,Rueggeberg/Marposs,Doppio colpo,Carlo Salvi,07/04/2026,SK400 LORO,SK400-2440,09/04/2026,[COLLAUDATA],,,
1090_2026_760,Invernizzi presse,Pressa,Cliente,22/04/2026,SK800 14CH,,,da fare,,,
4500158051,Fontana dest. Zoate,SP27,Cliente,23/04/2026,SK4.10 2+2+2,,,da fare,,,
1089_2026_752,Invernizzi presse,Pressa,Cliente,24/05/2026,SK800 14CH,,,da fare,,,
ZP64280,Camcar,RP320,Ingramatic,01/06/2026,SK4.10 3pads + DMI,,,da fare,,,
1010437090,IBS ,SP38 ,Sacma,02/07/2026,SK4.10 2+2,,,da fare,,,
4500082827,Fontana Veduggio,RP420,Ingramatic,01/09/2026,SK4.10 3pads + DMI,,,da fare,,,
4500148153,LOBO,SP47,Cliente,15/02/2026,SK4.10 3stamp.+2Rul,,,da fare,,,
4500148153,LOBO,SP47,Cliente,15/02/2026,SK4.10 3stamp.+2Rul,,,da fare,,,
1010437090,IBS ,SP38,Sacma,02/09/2026,SK4.10 2+2,,,da fare,,,
4500158788,LOBO,SP28 OCM269,Sacma,20/05/2026,SK4.10 3stamp.+2Rul,,,da fare,,,
1010419101,LOBO,SP28,Sacma,01/08/2026,SK4.10 2stamp.+2Rul,,,da fare,,,
XX200559,Sterling,RP720 R1,Ingramatic,30/11/2026,SK4.10 3pads+DMI,,,da fare,,,
1010419101,LOBO,SP28EL,Sacma,2025_FT94,SK4.10 2stamp.+1Rul,SK4.10-O25SH0645,21/01/2026,COLLAUDATA,,,
1010434291,LOBO,179 ---> 465,Cliente,2025_FT335,SK4.10,SK4.10-O25SH0483,,COLLAUDATA,,,
1010401742,LOBO,SP59,Sacma,2025_FT456,SK4.10,SK4.10-O25SH0616,24/11/2025,COLLAUDATA,,,
XX200521,Sterling,RP520,Ingramatic,01/07/2027,SK4.10 3pads + DMI,,,da fare,,,
XX200520,Sterling,RP520 R1,Ingramatic,10/07/2027,SK4.10 3pads + DMI,,,da fare,,,
XX200391,Sterling,RP520,Ingramatic,2024_FT88/26,SK4.10,Sk4.10-O26SH0065,03/04/2025,[COLLAUDATA] ,,,
1010419105,IBS,SP28 X,Sacma,2025 _FT288,SK4.10,SK4.10-O25SH0401,,COLLAUDATA,,,
57189,SBE ACERRA,Filettatrice 0214,Cliente,2025_FT106/26,SK4.10,Sk4.10-026OSH0068,26/03/2026,[COLLAUDATA] ,,,
57189,SBE ACERRA,Filettatrice 0218,Cliente,2025_FT107/26,SK4.10,Sk4.10-026OSH0069,24/03/2026,[COLLAUDATA] ,,,
2500573,Milani,macchina 021,Cliente,2025_FT111/26,SK4.10,SK4.10-*****,01/06/2025,[COLLAUDATA] ,,,
ZP66681,Camcar,KSP12,Sacma,2025_FT274,SK4.10,SK4.10-O25SH0397,,COLLAUDATA,,,
035051,Atibaia,SP28,Sacma,2025_FT275,SK4.10 3+2+2SCARTI,,,DA COLLAUDARE,,,
659/F,Smart,GR WU,Smart,2025_FT282,SK4.10,,,COLLAUDATA,,,
4500008192,Ingramatic,RP agrati medina usa,Ingramatic,2025_FT310,SK4.10,SK4.10-O25SH0398,,COLLAUDATA,,,
4500008192,Ingramatic,RP agrati medina usa,Ingramatic,2025_FT321,SK4.10,SK4.10-O25SH0399,,COLLAUDATA,,,
52792,SBE,Filettatrici,Cliente,2025_FT326,SK4.10,SK4.10-O25SH0481,,COLLAUDATA,,,
52792,SBE,Filettatrici,Cliente,2025_FT327,SK4.10,SK4.10-O25SH0482,,COLLAUDATA,,,
52792,SBE,Filettatrici,Cliente,2025_FT328,SK4.10,SK4.10-O25SH0484,,COLLAUDATA,,,
57189,SBE,Filettatrice 0154 ,Cliente,2025_FT332,SK4.10,SK4.10-O25SH0486,,COLLAUDATA,,,
57189,SBE,Filettatrice 0162,Cliente,2025_FT333,SK4.10,SK4.10-O25SH0487,,COLLAUDATA,,MACCHINA 0102 ,
2500573,Milani,macchina 560,Cliente,2025_FT34,SK200T,SK200T-025SH0419,26/01/2026,COLLAUDATA,,MACCHINA 0136,
2500573,Milani,macchina 561,Cliente,2025_FT34,SK200T,SK200T-025SH0423,26/01/2026,COLLAUDATA,,,
2500573,Milani,macchina 601,Cliente,2025_FT34,SK400,SK400-3638 ( EX 560 ),27/01/2026,COLLAUDATA,,,
XX350159,Frankfort,SP58,Sacma,2025_FT363,SK4.10,SK4.10- O25SH0400,,COLLAUDATA,,,
2500573,Milani,macchina 040,Cliente,2025_FT364,SK4.10,SK4.10 - O25SH605,,COLLAUDATA,,,
2500573,Milani,macchina 570,Cliente,2025_FT364,SK200T,SK200T - O25SH0421 (580) + SK200T - O25SH0420 (570),,COLLAUDATA,,,
4500121361,Fontana Veduggio,SP per spalle R177,Cliente,2025_FT365,SK4.10,SK4.10-O25SH0606,,COLLAUDATA,,,
4500121361,Fontana Veduggio,SP per spalle R195,Cliente,2025_FT366,SK4.10,SK4.10-O25SH0485,,COLLAUDATA,,,
1010446746,IBS,SP38SL,Sacma,2025_FT372,SK4.10 3+2+2SCARTI,SK4.10- O25SH0488,,COLLAUDATA,,,
0357,Leonix,SP25,Cliente,2025_FT387,SK4.10,SK4.10-O25SH0617,20/11/2025,COLLAUDATA,,,
57189,SBE,Filettatrice 0136,Cliente,2025_FT391,SK4.10,SK4.10-O25SH0611,,COLLAUDATA,,,
57189,SBE,Filettatrice 0102,Cliente,2025_FT392,SK4.10,SK4.10-O25SH0612,,COLLAUDATA,,,
4500009726,Ingramatic,RP520 SPIT,Ingramatic,2025_FT394,SK4.10 3pads no DMI,SK4.10-O25SH0613,,COLLAUDATA,,,
119,Kamec,Bruderer,Cliente,2025_FT399,SK4.10,SK4.10-O25SH0607,,NN SI COLLAUDA,,,
57189,SBE ACERRA,Filettatrice 0212,Cliente,2025_FT429,SK4.10,SK4.10-O25SH0650,10/12/2025,COLLAUDATA,,,
57189,SBE ACERRA,Filettatrice 0213,Cliente,2025_FT430,SK4.10,SK4.10-O25SH0651,10/12/2025,COLLAUDATA,,,
Mail 06/11,TSP,CTRN10,Cliente,2025_FT434,SK4.10 2CH+Rais,SK4.10-O25SH0615,03/12/2025,COLLAUDATA,,,
4500121361,Fontana Veduggio,SP per spalle R223,Cliente,2025_FT437,SK4.10,SK4.10-O25SH0649,16/12/2025,COLLAUDATA,,,
4500121361,Fontana Veduggio,SP per spalle R213 (nell'ordine originale era 168),Cliente,2025_FT437,SK4.10,SK4.10-O25SH0648,17/12/2025,COLLAUDATA,,,
4500110649,Fontana dest. Zoate,SP38 (S15),Sacma,2025_FT82/26,SK4.10 3+2,SK4.10-O25SH0629,05/02/2026,[DA COLLAUDARE],,,
06/02/2026,Milani,macchina 653,Cliente,2026_FT109,SK4.10,SK4.10-26SH0073,03/03/2026,[COLLAUDATA],,,
1010419105,IBS ,SP38 EL,Sacma,2026_FT123,SK4.10,SK4.10-26SH0072,,[DA COLLAUDARE] ,,,
1026,SMEL,SP260,Cliente,2026_FT126/26,SK5.12 5 staz.,Sk5.12-O25SH0590,31/03/2026,da fare,,,
1010446580,LOBO,SP18,Sacma,2026_FT2,SK4.10 3+2+2SCARTI,SK4.10-O25SH0628,14/01/2026,COLLAUDATA,,,
4500123194,Fontana Veduggio,TLM16,Cliente,2026_FT62,SK4.10 2sens. portap,O25SH0544,18/02/2026,COLLAUDATA,,,
4500011225,Ingramatic,RP220R1 Agrati USA,Ingramatic,2026_FT79/26,SK4.10 3pads + DMI,SK4.10-26SH0066,13/02/2026,[COLLAUDATA],,,
035052,Atibaia,SP28,Sacma,2026_FT80,SK4.10 3+2+2SCARTI,,29/01/2026,DA COLLAUDARE,,,
1010446580,LOBO,SP18,Sacma,2026_FT83,SK4.10 3+2+2SCARTI,Sk4.10-026OSH0067,16/03/2026,[DA COLLAUDARE] ,,,`;

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

async function run() {
    const rows = csvData.split('\n').filter(l => l.trim());
    const dataLines = rows.slice(1);
    
    const cellMap = {};
    function colLetter(c) {
        let s = '', n = c;
        while (n >= 0) { s = String.fromCharCode((n % 26) + 65) + s; n = Math.floor(n / 26) - 1; }
        return s;
    }

    dataLines.forEach((line, r) => {
        const segs = line.split(',');
        segs.forEach((val, c) => {
            if (val && val.trim()) {
                cellMap[colLetter(c) + (r + 2)] = val.trim();
            }
        });
    });

    console.log('Updating Firestore...');
    const ref = doc(db, 'fogli_condivisi', 'ordini');
    await updateDoc(ref, {
        data: cellMap,
        comments: {}
    });
    console.log('DONE.');
}

run().catch(console.error);

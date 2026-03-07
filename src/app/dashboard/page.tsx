"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

import CalendarHeatmap from "react-calendar-heatmap";
import "react-calendar-heatmap/dist/styles.css";

export default function Dashboard(){

const [data,setData]=useState<any[]>([]);
const [targets,setTargets]=useState<any[]>([]);
const [promotors,setPromotors]=useState<any[]>([]);

const [areaFilter,setAreaFilter]=useState("");
const [satorFilter,setSatorFilter]=useState("");
const [monthFilter,setMonthFilter]=useState("");

/* ===============================
LOAD DATA
=============================== */

useEffect(()=>{

loadData();
loadTargets();
loadPromotors();

const channel = supabase
.channel("realtime-kredit")
.on(
"postgres_changes",
{ event:"*", schema:"public", table:"kredit_vast" },
()=> loadData()
)
.subscribe();

return()=>{ supabase.removeChannel(channel); };

},[]);

async function loadData(){
const { data } = await supabase
.from("kredit_vast")
.select("*");

if(data) setData(data);
}

async function loadTargets(){
const { data } = await supabase
.from("targets")
.select("*");

if(data) setTargets(data);
}

async function loadPromotors(){
const { data } = await supabase
.from("promotors")
.select("*");

if(data) setPromotors(data);
}

/* ===============================
AREA & SATOR LIST
=============================== */

const areaList=[...new Set(promotors.map(p=>p.area).filter(Boolean))];

const satorList=[...new Set(promotors.map(p=>p.sator).filter(Boolean))];

/* ===============================
FILTER DATA
=============================== */

const filtered=data.filter(d=>{

const promotorData = promotors.find(
p=>p.nama_promotor===d.promotor
);

const area = promotorData?.area;
const sator = promotorData?.sator;

if(areaFilter && area!==areaFilter) return false;

if(satorFilter && sator!==satorFilter) return false;

if(monthFilter){
const month=new Date(d.tanggal).getMonth()+1;
if(month!==parseInt(monthFilter)) return false;
}

return true;

});

/* ===============================
KPI
=============================== */

const total=filtered.length;

const closing=filtered.filter(
d=>d.status==="Closing"
).length;

/* ===============================
TARGET
=============================== */

const filteredPromotors = promotors.filter(p=>{

if(areaFilter && p.area!==areaFilter) return false;

if(satorFilter && p.sator!==satorFilter) return false;

return true;

});

const promotorNames = filteredPromotors.map(
p=>p.nama_promotor
);

const filteredTargets = targets.filter(
t=>promotorNames.includes(t.promotor)
);

const totalTarget = filteredTargets.reduce(
(sum,t)=>sum+(t.target||0),
0
);

const achievement = totalTarget
? ((closing/totalTarget)*100).toFixed(1)
: 0;

/* ===============================
AI PREDICTION
=============================== */

const today=new Date();

const currentDay=today.getDate();

const daysInMonth=new Date(
today.getFullYear(),
today.getMonth()+1,
0
).getDate();

const avgClosingPerDay = closing/currentDay;

const predictedClosing = Math.round(
avgClosingPerDay * daysInMonth
);

/* ===============================
AREA PROGRESS
=============================== */

const areaStats:any={};

filtered.forEach(d=>{

const promotorData = promotors.find(
p=>p.nama_promotor===d.promotor
);

const area = promotorData?.area;

if(!area) return;

if(!areaStats[area]){
areaStats[area]={closing:0};
}

if(d.status==="Closing"){
areaStats[area].closing++;
}

});

const areaProgress=Object.keys(areaStats).map(a=>({

area:a,

closing:areaStats[a].closing,

target: filteredTargets
.filter(t=>t.area===a)
.reduce((sum,t)=>sum+(t.target||0),0)

}));

/* ===============================
DEALER LEADERBOARD
=============================== */

const dealerStats:any={};

filtered.forEach(d=>{

if(!dealerStats[d.toko]){
dealerStats[d.toko]={pengajuan:0,closing:0};
}

dealerStats[d.toko].pengajuan++;

if(d.status==="Closing"){
dealerStats[d.toko].closing++;
}

});

const dealerLeaderboard=Object.keys(dealerStats)
.map(t=>({

toko:t,
pengajuan:dealerStats[t].pengajuan,
closing:dealerStats[t].closing,

index: dealerStats[t].pengajuan
? Math.round((dealerStats[t].closing/dealerStats[t].pengajuan)*100)
:0

}))
.sort((a,b)=>b.closing-a.closing);

/* ===============================
SPV LEADERBOARD
=============================== */

const spvStats:any={};

filtered.forEach(d=>{

const promotorData = promotors.find(
p=>p.nama_promotor===d.promotor
);

const sator = promotorData?.sator;

if(!sator) return;

if(!spvStats[sator]){
spvStats[sator]={pengajuan:0,closing:0};
}

spvStats[sator].pengajuan++;

if(d.status==="Closing"){
spvStats[sator].closing++;
}

});

const spvLeaderboard=Object.keys(spvStats)
.map(s=>({

sator:s,
pengajuan:spvStats[s].pengajuan,
closing:spvStats[s].closing

}))
.sort((a,b)=>b.closing-a.closing);

/* ===============================
PROMOTOR LEADERBOARD
=============================== */

const promotorArea:any={};

filtered.forEach(d=>{

const promotorData = promotors.find(
p=>p.nama_promotor===d.promotor
);

const area = promotorData?.area;

if(!area) return;

const key=area+"-"+d.promotor;

if(!promotorArea[key]){
promotorArea[key]={area,promotor:d.promotor,closing:0};
}

if(d.status==="Closing"){
promotorArea[key].closing++;
}

});

const promotorAreaRank=Object.values(promotorArea)
.sort((a:any,b:any)=>b.closing-a.closing);

/* ===============================
HEATMAP
=============================== */

const heatmapData=filtered
.filter(d=>d.status==="Closing")
.map(d=>({date:d.tanggal,count:1}));

/* ===============================
EXPORT EXCEL
=============================== */

function exportExcel(){

const worksheet=XLSX.utils.json_to_sheet(filtered);

const workbook=XLSX.utils.book_new();

XLSX.utils.book_append_sheet(
workbook,
worksheet,
"report"
);

const excelBuffer=XLSX.write(
workbook,
{bookType:"xlsx",type:"array"}
);

const blob=new Blob(
[excelBuffer],
{type:"application/octet-stream"}
);

saveAs(blob,"report_kredit.xlsx");

}

/* ===============================
UI
=============================== */

return(

<div className="p-6 space-y-10">

<h1 className="text-3xl font-bold">
Dashboard Kredit Vivo Flores
</h1>

{/* FILTER */}

<div className="flex gap-3 flex-wrap">

<select
className="border p-2 rounded"
value={areaFilter}
onChange={(e)=>setAreaFilter(e.target.value)}
>

<option value="">Filter Area</option>

{areaList.map((a,i)=>(
<option key={i} value={a}>{a}</option>
))}

</select>

<select
className="border p-2 rounded"
value={satorFilter}
onChange={(e)=>setSatorFilter(e.target.value)}
>

<option value="">Filter Sator</option>

{satorList.map((s,i)=>(
<option key={i} value={s}>{s}</option>
))}

</select>

<select
className="border p-2 rounded"
value={monthFilter}
onChange={(e)=>setMonthFilter(e.target.value)}
>

<option value="">Filter Bulan</option>

<option value="1">Jan</option>
<option value="2">Feb</option>
<option value="3">Mar</option>
<option value="4">Apr</option>
<option value="5">Mei</option>
<option value="6">Jun</option>
<option value="7">Jul</option>
<option value="8">Agu</option>
<option value="9">Sep</option>
<option value="10">Okt</option>
<option value="11">Nov</option>
<option value="12">Des</option>

</select>

<button
onClick={exportExcel}
className="bg-green-600 text-white px-4 py-2 rounded"
>
Export Excel
</button>

</div>

{/* KPI */}

<div className="grid grid-cols-2 md:grid-cols-5 gap-4">

<div className="bg-blue-500 text-white p-4 rounded">
Total
<h2 className="text-2xl">{total}</h2>
</div>

<div className="bg-green-500 text-white p-4 rounded">
Closing
<h2 className="text-2xl">{closing}</h2>
</div>

<div className="bg-gray-800 text-white p-4 rounded">
Target
<h2 className="text-2xl">{totalTarget}</h2>
</div>

<div className="bg-emerald-700 text-white p-4 rounded">
Achievement
<h2 className="text-2xl">{achievement}%</h2>
</div>

<div className="bg-yellow-600 text-white p-4 rounded">
AI Prediksi
<h2 className="text-2xl">{predictedClosing}</h2>
</div>

</div>

{/* TARGET PROGRESS */}

<h2 className="text-xl font-bold">
Target Progress per Area
</h2>

{areaProgress.map((a,i)=>{

const percent=a.target
? Math.round((a.closing/a.target)*100)
:0;

return(

<div key={i} className="mb-3">

<div className="flex justify-between text-sm">
<span>{a.area}</span>
<span>{a.closing}/{a.target}</span>
</div>

<div className="w-full bg-gray-200 rounded h-3">

<div
className="bg-green-500 h-3 rounded"
style={{width:percent+"%"}}
/>

</div>

</div>

)

})}

{/* DEALER */}

<h2 className="text-xl font-bold">
Leaderboard Dealer
</h2>

<table className="w-full border">

<thead className="bg-gray-200">

<tr>
<th>Rank</th>
<th>Dealer</th>
<th>Pengajuan</th>
<th>Closing</th>
<th>Index</th>
</tr>

</thead>

<tbody>

{dealerLeaderboard.map((d,i)=>(

<tr key={i}>

<td>{i+1}</td>
<td>{d.toko}</td>
<td>{d.pengajuan}</td>
<td>{d.closing}</td>
<td>{d.index}%</td>

</tr>

))}

</tbody>

</table>

{/* SPV */}

<h2 className="text-xl font-bold">
Leaderboard SPV
</h2>

<table className="w-full border">

<thead className="bg-gray-200">

<tr>
<th>Rank</th>
<th>SPV</th>
<th>Pengajuan</th>
<th>Closing</th>
</tr>

</thead>

<tbody>

{spvLeaderboard.map((s,i)=>(

<tr key={i}>

<td>{i+1}</td>
<td>{s.sator}</td>
<td>{s.pengajuan}</td>
<td>{s.closing}</td>

</tr>

))}

</tbody>

</table>

{/* PROMOTOR */}

<h2 className="text-xl font-bold">
Leaderboard Promotor per Area
</h2>

<table className="w-full border">

<thead className="bg-gray-200">

<tr>
<th>Rank</th>
<th>Area</th>
<th>Promotor</th>
<th>Closing</th>
</tr>

</thead>

<tbody>

{promotorAreaRank.slice(0,20).map((p:any,i)=>(

<tr
key={i}
className={i===0?"bg-yellow-200 font-bold":""}
>

<td>{i+1}</td>
<td>{p.area}</td>
<td>{p.promotor}</td>
<td>{p.closing}</td>

</tr>

))}

</tbody>

</table>

{/* HEATMAP */}

<h2 className="text-xl font-bold">
Heatmap Closing Harian
</h2>

<CalendarHeatmap
startDate="2026-01-01"
endDate="2026-12-31"
values={heatmapData}
/>

</div>

);

}
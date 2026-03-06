"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

import {
BarChart,
Bar,
XAxis,
YAxis,
Tooltip,
ResponsiveContainer,
CartesianGrid,
LineChart,
Line
} from "recharts";

import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

export default function Dashboard(){

const [data,setData]=useState<any[]>([]);
const [targets,setTargets]=useState<any[]>([]);
const [promotors,setPromotors]=useState<any[]>([]);

const [areaFilter,setAreaFilter]=useState("");
const [satorFilter,setSatorFilter]=useState("");

useEffect(()=>{
loadData();
loadTargets();
loadPromotors();
},[]);



async function loadData(){
const { data } = await supabase.from("kredit_vast").select("*");
if(data) setData(data);
}

async function loadTargets(){
const { data } = await supabase.from("targets").select("*");
if(data) setTargets(data);
}

async function loadPromotors(){
const { data } = await supabase.from("promotors").select("*");
if(data) setPromotors(data);
}



const areaList=[...new Set(promotors.map(p=>p.area).filter(Boolean))];
const satorList=[...new Set(promotors.map(p=>p.sator).filter(Boolean))];



const filtered=data.filter(d=>{
if(areaFilter && d.area!==areaFilter) return false;
if(satorFilter && d.sator!==satorFilter) return false;
return true;
});



const total=filtered.length;
const pending=filtered.filter(d=>d.status==="Pending").length;
const tacc=filtered.filter(d=>d.status==="TACC").length;
const acc=filtered.filter(d=>d.status==="ACC").length;
const closing=filtered.filter(d=>d.status==="Closing").length;
const reject=filtered.filter(d=>d.status==="Reject").length;



/* ===============================
   LEADERBOARD DEALER
================================ */

const dealerStats:any={};

filtered.forEach(d=>{

if(!dealerStats[d.toko]){

dealerStats[d.toko]={
pengajuan:0,
closing:0
};

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
closing:dealerStats[t].closing

}))
.sort((a,b)=>b.closing-a.closing);



/* ===============================
   LEADERBOARD SPV
================================ */

const spvStats:any={};

filtered.forEach(d=>{

if(!spvStats[d.sator]){

spvStats[d.sator]={
pengajuan:0,
closing:0
};

}

spvStats[d.sator].pengajuan++;

if(d.status==="Closing"){
spvStats[d.sator].closing++;
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
   TREND CLOSING PER MINGGU
================================ */

function getWeek(date:any){

const d=new Date(date);
const first=new Date(d.getFullYear(),0,1);
const diff=(d.getTime()-first.getTime())/86400000;
return Math.ceil((diff+first.getDay()+1)/7);

}

const weeklyStats:any={};

filtered.forEach(d=>{

if(d.status!=="Closing") return;

const week=getWeek(d.tanggal);

if(!weeklyStats[week]) weeklyStats[week]=0;

weeklyStats[week]++;

});

const weeklyChart=Object.keys(weeklyStats).map(w=>({

week:"Week "+w,
closing:weeklyStats[w]

}));



/* ===============================
   AI PREDIKSI CLOSING
================================ */

const daysPassed=new Set(
filtered
.filter(d=>d.status==="Closing")
.map(d=>d.tanggal)
).size;

const avgPerDay=daysPassed? closing/daysPassed : 0;

const today=new Date();
const daysInMonth=new Date(today.getFullYear(),today.getMonth()+1,0).getDate();

const predictedClosing=Math.round(avgPerDay*daysInMonth);



/* ===============================
   TARGET VS ACHIEVEMENT
================================ */

const promotorStats:any={};

filtered.forEach(d=>{

if(!promotorStats[d.promotor]) promotorStats[d.promotor]=0;

if(d.status==="Closing") promotorStats[d.promotor]++;

});

const targetMap:any={};

targets.forEach(t=>{
targetMap[t.promotor]=t.target;
});

const targetChart=Object.keys(promotorStats).map(p=>({

promotor:p,
closing:promotorStats[p],
target:targetMap[p]||0

}));



/* ===============================
   EXPORT EXCEL
================================ */

function exportExcel(){

const worksheet=XLSX.utils.json_to_sheet(filtered);
const workbook=XLSX.utils.book_new();

XLSX.utils.book_append_sheet(workbook,worksheet,"report");

const excelBuffer=XLSX.write(workbook,{bookType:"xlsx",type:"array"});

const blob=new Blob([excelBuffer],{type:"application/octet-stream"});

saveAs(blob,"report_kredit.xlsx");

}



/* ===============================
   UI
================================ */

return(

<div className="p-4 md:p-10 space-y-10">

<div className="flex items-center justify-between border-b pb-4">

<h1 className="text-xl md:text-3xl font-bold">
Dashboard Kredit Vivo Flores
</h1>

<img
src="/logo-vivo.png"
alt="Vivo Logo"
className="h-10 md:h-14 object-contain"
/>

</div>


{/* FILTER */}

<div className="flex flex-col md:flex-row gap-3">

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

<button
onClick={exportExcel}
className="bg-green-600 text-white px-4 py-2 rounded"
>
Export Excel
</button>

</div>



{/* KPI */}

<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">

<div className="bg-blue-500 text-white p-4 rounded">
Total
<h2 className="text-2xl">{total}</h2>
</div>

<div className="bg-yellow-500 text-white p-4 rounded">
Pending
<h2 className="text-2xl">{pending}</h2>
</div>

<div className="bg-purple-500 text-white p-4 rounded">
TACC
<h2 className="text-2xl">{tacc}</h2>
</div>

<div className="bg-green-500 text-white p-4 rounded">
ACC
<h2 className="text-2xl">{acc}</h2>
</div>

<div className="bg-indigo-500 text-white p-4 rounded">
Closing
<h2 className="text-2xl">{closing}</h2>
</div>

<div className="bg-red-500 text-white p-4 rounded">
Reject
<h2 className="text-2xl">{reject}</h2>
</div>

</div>



{/* AI PREDIKSI */}

<div className="bg-gray-100 p-5 rounded">

<h2 className="font-bold text-lg">
AI Prediksi Closing Bulan Ini
</h2>

<p className="text-3xl font-bold text-green-600">
{predictedClosing}
</p>

<p className="text-sm text-gray-500">
Berdasarkan rata-rata closing harian
</p>

</div>



{/* TREND CLOSING */}

<h2 className="text-xl font-bold">
Trend Closing per Minggu
</h2>

<ResponsiveContainer width="100%" height={250}>

<LineChart data={weeklyChart}>

<CartesianGrid strokeDasharray="3 3"/>

<XAxis dataKey="week"/>

<YAxis/>

<Tooltip/>

<Line type="monotone" dataKey="closing" stroke="#22c55e" strokeWidth={3}/>

</LineChart>

</ResponsiveContainer>



{/* TARGET VS ACHIEVEMENT */}

<h2 className="text-xl font-bold">
Target vs Achievement Promotor
</h2>

<ResponsiveContainer width="100%" height={300}>

<BarChart data={targetChart}>

<CartesianGrid strokeDasharray="3 3"/>

<XAxis dataKey="promotor"/>

<YAxis/>

<Tooltip/>

<Bar dataKey="target" fill="#94a3b8"/>

<Bar dataKey="closing" fill="#22c55e"/>

</BarChart>

</ResponsiveContainer>



{/* LEADERBOARD DEALER */}

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

</tr>

</thead>

<tbody>

{dealerLeaderboard.map((d,i)=>(

<tr key={i} className="border">

<td>{i+1}</td>
<td>{d.toko}</td>
<td>{d.pengajuan}</td>
<td>{d.closing}</td>

</tr>

))}

</tbody>

</table>



{/* LEADERBOARD SPV */}

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

<tr key={i} className="border">

<td>{i+1}</td>
<td>{s.sator}</td>
<td>{s.pengajuan}</td>
<td>{s.closing}</td>

</tr>

))}

</tbody>

</table>



</div>

);

}
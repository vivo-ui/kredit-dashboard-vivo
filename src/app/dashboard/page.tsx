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
import CalendarHeatmap from "react-calendar-heatmap";
import "react-calendar-heatmap/dist/styles.css";

export default function Dashboard(){

const [data,setData]=useState<any[]>([]);
const [targets,setTargets]=useState<any[]>([]);
const [promotors,setPromotors]=useState<any[]>([]);

const [areaFilter,setAreaFilter]=useState("");
const [satorFilter,setSatorFilter]=useState("");
const [monthFilter,setMonthFilter]=useState("");

useEffect(()=>{

loadData();
loadTargets();
loadPromotors();

/* REALTIME UPDATE */

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

if(monthFilter){

const month=new Date(d.tanggal).getMonth()+1;

if(month!==parseInt(monthFilter)) return false;

}

return true;

});

const total=filtered.length;
const pending=filtered.filter(d=>d.status==="Pending").length;
const tacc=filtered.filter(d=>d.status==="TACC").length;
const acc=filtered.filter(d=>d.status==="ACC").length;
const closing=filtered.filter(d=>d.status==="Closing").length;
const reject=filtered.filter(d=>d.status==="Reject").length;

/* TARGET BULAN */

const monthClosing=filtered.filter(d=>d.status==="Closing").length;

const totalTarget=targets.reduce((sum,t)=>sum+(t.target||0),0);

const gapTarget=totalTarget-monthClosing;

const achievement= totalTarget ? ((monthClosing/totalTarget)*100).toFixed(1) : 0;

/* AI PREDIKSI */

const today=new Date();
const currentDay=today.getDate();
const daysInMonth=new Date(today.getFullYear(),today.getMonth()+1,0).getDate();

const avgClosingPerDay=monthClosing/currentDay;
const predictedClosing=Math.round(avgClosingPerDay*daysInMonth);

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
   LEADERBOARD PROMOTOR AREA
================================ */

const promotorArea:any={};

filtered.forEach(d=>{

const key=d.area+"-"+d.promotor;

if(!promotorArea[key]){

promotorArea[key]={
area:d.area,
promotor:d.promotor,
closing:0
};

}

if(d.status==="Closing"){
promotorArea[key].closing++;
}

});

const promotorAreaRank=Object.values(promotorArea)
.sort((a:any,b:any)=>b.closing-a.closing);

/* ===============================
   TREND CLOSING
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

/* HEATMAP */

const heatmapData=filtered
.filter(d=>d.status==="Closing")
.map(d=>({
date:d.tanggal,
count:1
}));

/* EXPORT */

function exportExcel(){

const worksheet=XLSX.utils.json_to_sheet(filtered);
const workbook=XLSX.utils.book_new();

XLSX.utils.book_append_sheet(workbook,worksheet,"report");

const excelBuffer=XLSX.write(workbook,{bookType:"xlsx",type:"array"});

const blob=new Blob([excelBuffer],{type:"application/octet-stream"});

saveAs(blob,"report_kredit.xlsx");

}

/* UI */

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

<select
className="border p-2 rounded"
value={monthFilter}
onChange={(e)=>setMonthFilter(e.target.value)}
>
<option value="">Filter Bulan</option>
<option value="1">Januari</option>
<option value="2">Februari</option>
<option value="3">Maret</option>
<option value="4">April</option>
<option value="5">Mei</option>
<option value="6">Juni</option>
<option value="7">Juli</option>
<option value="8">Agustus</option>
<option value="9">September</option>
<option value="10">Oktober</option>
<option value="11">November</option>
<option value="12">Desember</option>
</select>

<button
onClick={exportExcel}
className="bg-green-600 text-white px-4 py-2 rounded"
>
Export Excel
</button>

</div>

{/* KPI */}

<div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">

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
Prediksi Closing
<h2 className="text-2xl">{predictedClosing}</h2>
</div>

</div>

{/* HEATMAP */}

<h2 className="text-xl font-bold">
Heatmap Closing Harian
</h2>

<CalendarHeatmap
startDate="2026-01-01"
endDate="2026-12-31"
values={heatmapData}
/>

{/* TREND */}

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

{/* LEADERBOARD PROMOTOR */}

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
<tr key={i} className="border">
<td>{i+1}</td>
<td>{p.area}</td>
<td>{p.promotor}</td>
<td>{p.closing}</td>
</tr>
))}
</tbody>
</table>

</div>

);

}
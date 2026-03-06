"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

import {
BarChart,
Bar,
XAxis,
YAxis,
Tooltip,
ResponsiveContainer
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

useEffect(()=>{
loadData();
loadTargets();
loadPromotors();
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

const areaList=[...new Set(promotors.map(p=>p.area))];
const satorList=[...new Set(promotors.map(p=>p.sator))];

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

const areaStats:any={};

filtered.forEach(d=>{
if(!areaStats[d.area]) areaStats[d.area]=0;
if(d.status==="Closing") areaStats[d.area]++;
});

const areaChart=Object.keys(areaStats).map(a=>({
area:a,
closing:areaStats[a]
}));

const tokoStats:any={};

filtered.forEach(d=>{
if(!tokoStats[d.toko]) tokoStats[d.toko]=0;
if(d.status==="Closing") tokoStats[d.toko]++;
});

const tokoChart=Object.keys(tokoStats).map(t=>({
toko:t,
closing:tokoStats[t]
}));

const dailyStats:any={};

filtered.forEach(d=>{
if(!dailyStats[d.tanggal]) dailyStats[d.tanggal]=0;
if(d.status==="Closing") dailyStats[d.tanggal]++;
});

const dailyChart=Object.keys(dailyStats).map(t=>({
tanggal:t,
closing:dailyStats[t]
}));

const promotorStats:any={};

filtered.forEach(d=>{
if(!promotorStats[d.promotor]) promotorStats[d.promotor]=0;
if(d.status==="Closing") promotorStats[d.promotor]++;
});

const ranking=Object.keys(promotorStats)
.map(p=>({promotor:p,closing:promotorStats[p]}))
.sort((a,b)=>b.closing-a.closing);

const targetMap:any={};

targets.forEach(t=>{
targetMap[t.promotor]=t.target;
});

function exportExcel(){

const worksheet=XLSX.utils.json_to_sheet(filtered);

const workbook=XLSX.utils.book_new();

XLSX.utils.book_append_sheet(workbook,worksheet,"report");

const excelBuffer=XLSX.write(workbook,{bookType:"xlsx",type:"array"});

const blob=new Blob([excelBuffer],{type:"application/octet-stream"});

saveAs(blob,"report_kredit.xlsx");

}

return(

<div className="p-10 space-y-10">

<h1 className="text-3xl font-bold">
Dashboard Kredit Vivo NTT
</h1>

<div className="flex gap-4">

<select
className="border p-2"
value={areaFilter}
onChange={(e)=>setAreaFilter(e.target.value)}
>
<option value="">Filter Area</option>

{areaList.map((a,i)=>(
<option key={i} value={a}>
{a}
</option>
))}

</select>

<select
className="border p-2"
value={satorFilter}
onChange={(e)=>setSatorFilter(e.target.value)}
>
<option value="">Filter Sator</option>

{satorList.map((s,i)=>(
<option key={i} value={s}>
{s}
</option>
))}

</select>

<button
onClick={exportExcel}
className="bg-green-600 text-white px-4 py-2"
>
Export Excel
</button>

</div>

<div className="grid grid-cols-3 gap-5">

<div className="bg-blue-500 text-white p-5 rounded">
Total Pengajuan
<h2 className="text-2xl">{total}</h2>
</div>

<div className="bg-yellow-500 text-white p-5 rounded">
Pending
<h2 className="text-2xl">{pending}</h2>
</div>

<div className="bg-purple-500 text-white p-5 rounded">
TACC
<h2 className="text-2xl">{tacc}</h2>
</div>

<div className="bg-green-500 text-white p-5 rounded">
ACC
<h2 className="text-2xl">{acc}</h2>
</div>

<div className="bg-indigo-500 text-white p-5 rounded">
Closing
<h2 className="text-2xl">{closing}</h2>
</div>

<div className="bg-red-500 text-white p-5 rounded">
Reject
<h2 className="text-2xl">{reject}</h2>
</div>

</div>

<div className="grid grid-cols-2 gap-10">

<div>

<h2 className="text-xl font-bold mb-2">
Closing per Area
</h2>

<ResponsiveContainer width="100%" height={250}>

<BarChart data={areaChart}>

<XAxis dataKey="area"/>
<YAxis/>
<Tooltip/>

<Bar dataKey="closing"/>

</BarChart>

</ResponsiveContainer>

</div>

<div>

<h2 className="text-xl font-bold mb-2">
Closing per Toko
</h2>

<ResponsiveContainer width="100%" height={250}>

<BarChart data={tokoChart}>

<XAxis dataKey="toko"/>
<YAxis/>
<Tooltip/>

<Bar dataKey="closing"/>

</BarChart>

</ResponsiveContainer>

</div>

</div>

<div>

<h2 className="text-xl font-bold mb-2">
Closing per Hari
</h2>

<ResponsiveContainer width="100%" height={250}>

<BarChart data={dailyChart}>

<XAxis dataKey="tanggal"/>
<YAxis/>
<Tooltip/>

<Bar dataKey="closing"/>

</BarChart>

</ResponsiveContainer>

</div>

<div>

<h2 className="text-xl font-bold mb-2">
Heatmap Closing Activity
</h2>

<CalendarHeatmap
startDate="2026-01-01"
endDate="2026-12-31"
values={data.map(d=>({
date:d.tanggal,
count:d.status==="Closing"?1:0
}))}
/>

</div>

<h2 className="text-2xl font-bold">
Ranking Promotor
</h2>

<table className="w-full border">

<thead>

<tr className="bg-gray-200">

<th>Rank</th>
<th>Promotor</th>
<th>Closing</th>
<th>Target</th>
<th>Achievement</th>

</tr>

</thead>

<tbody>

{ranking.map((r,i)=>{

const target=targetMap[r.promotor]||0;
const ach=target?((r.closing/target)*100).toFixed(1):0;

return(

<tr key={i} className="border">

<td>{i+1}</td>
<td>{r.promotor}</td>
<td>{r.closing}</td>
<td>{target}</td>
<td>{ach}%</td>

</tr>

);

})}

</tbody>

</table>

<h2 className="text-2xl font-bold">
Monitoring Pengajuan
</h2>

<table className="w-full border text-sm">

<thead>

<tr className="bg-gray-200">

<th>Tanggal</th>
<th>Konsumen</th>
<th>Toko</th>
<th>Promotor</th>
<th>Status</th>

</tr>

</thead>

<tbody>

{filtered.map((d,i)=>(

<tr key={i} className="border">

<td>{d.tanggal}</td>
<td>{d.konsumen}</td>
<td>{d.toko}</td>
<td>{d.promotor}</td>
<td>{d.status}</td>

</tr>

))}

</tbody>

</table>

</div>

);

}
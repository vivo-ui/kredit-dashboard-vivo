"use client";

import { useEffect,useState } from "react";
import { supabase } from "../../lib/supabaseClient";

import {
PieChart,
Pie,
Cell,
ResponsiveContainer,
LineChart,
Line,
CartesianGrid,
XAxis,
YAxis,
Tooltip
} from "recharts";

import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

export default function Dashboard(){

const [tab,setTab]=useState("dashboard");

const [data,setData]=useState<any[]>([]);
const [promotors,setPromotors]=useState<any[]>([]);
const [tokos,setTokos]=useState<any[]>([]);
const [targets,setTargets]=useState<any[]>([]);

const [monthFilter,setMonthFilter]=useState("");
const [dateFilter,setDateFilter]=useState("");
const [startDate,setStartDate]=useState("");
const [endDate,setEndDate]=useState("");

useEffect(()=>{

loadData();
loadPromotors();
loadTokos();
loadTargets();

},[]);

async function loadData(){
const { data } = await supabase
.from("kredit_vast")
.select("*");

setData(data || []);
}

async function loadPromotors(){
const { data } = await supabase
.from("promotors")
.select("*");

setPromotors(data || []);
}

async function loadTokos(){
const { data } = await supabase
.from("tokos")
.select("*");

setTokos(data || []);
}

async function loadTargets(){
const { data } = await supabase
.from("targets")
.select("*");

setTargets(data || []);
}

/* =====================
FILTER BULAN
===================== */

const filteredData = data.filter(d=>{

/* FILTER TANGGAL */

if(dateFilter){
return d.tanggal === dateFilter;
}

/* FILTER BULAN */

if(monthFilter){
const month = new Date(d.tanggal).getMonth()+1;
return month === parseInt(monthFilter);
}

return true;

});

/* =====================
PROGRESS HARI INI
===================== */

const today = new Date().toISOString().slice(0,10);

const todayData = filteredData.filter(
d=>d.tanggal===today
);

const closing = todayData.filter(d=>d.status==="Closing").length;
const pending = todayData.filter(d=>d.status==="Pending").length;
const reject = todayData.filter(d=>d.status==="Reject").length;

const totalToday = todayData.length;

const progressData=[
{ name:"progress", value:totalToday },
{ name:"remain", value:100-totalToday }
];

const COLORS=["#3b82f6","#e5e7eb"];

/* =====================
TARGET BULAN
===================== */

const month = new Date().toISOString().slice(0,7);

const monthTargets = targets.filter(
t=>t.bulan===month
);

const totalTarget = monthTargets.reduce(
(sum,t)=>sum+t.target,
0
);

/* =====================
TOTAL INPUT BULAN INI
===================== */

const monthInput = filteredData.length;

/* STATUS BREAKDOWN */

const monthClosing = filteredData.filter(
d=>d.status==="Closing"
).length;

const monthPending = filteredData.filter(
d=>d.status==="Pending"
).length;

const monthReject = filteredData.filter(
d=>d.status==="Reject"
).length;

/* =====================
PERSENTASE TARGET
===================== */

const percentTarget = totalTarget
? Math.round((monthInput/totalTarget)*100)
:0;

/* =====================
PERFORMA SATOR
===================== */

const satorStats:any={};

filteredData.forEach(d=>{

const p=promotors.find(
x=>x.nama_promotor===d.promotor
);

const sator=p?.sator;

if(!sator) return;

if(!satorStats[sator]){
satorStats[sator]={input:0,target:0};
}

satorStats[sator].input++;

});

targets.forEach(t=>{

const p=promotors.find(
x=>x.nama_promotor===t.promotor
);

const sator=p?.sator;

if(!sator) return;

if(!satorStats[sator]){
satorStats[sator]={input:0,target:0};
}

satorStats[sator].target+=t.target;

});

const satorPerformance = Object.keys(satorStats).map(s=>{

const input=satorStats[s].input;
const target=satorStats[s].target;

const percent = target
? Math.round((input/target)*100)
:0;

return{
sator:s,
input,
target,
percent
};

});

/* =====================
PERFORMA AREA
===================== */

const areaStats:any={};

filteredData.forEach(d=>{

const p=promotors.find(
x=>x.nama_promotor===d.promotor
);

const area=p?.area;

if(!area) return;

if(!areaStats[area]){
areaStats[area]={input:0,target:0};
}

areaStats[area].input++;

});

targets.forEach(t=>{

const p=promotors.find(
x=>x.nama_promotor===t.promotor
);

const area=p?.area;

if(!area) return;

if(!areaStats[area]){
areaStats[area]={input:0,target:0};
}

areaStats[area].target+=t.target;

});

const areaPerformance = Object.keys(areaStats).map(a=>{

const input=areaStats[a].input;
const target=areaStats[a].target;

const percent = target
? Math.round((input/target)*100)
:0;

return{
area:a,
input,
target,
percent
};

});

/* =====================
GRAFIK HARIAN
===================== */

const filteredGrafik = data.filter((item:any)=>{

if(!startDate && !endDate) return true;

const tgl = new Date(item.tanggal);

if(startDate && new Date(startDate) > tgl) return false;
if(endDate && new Date(endDate) < tgl) return false;

return true;

});

const grafikHarian = filteredGrafik
.reduce((acc:any[],item:any)=>{

const tanggal = new Date(item.tanggal)
.toISOString()
.split("T")[0];

const found = acc.find(d=>d.tanggal===tanggal);

if(found){
found.total +=1;
}else{
acc.push({
tanggal,
total:1
});
}

return acc;

},[])
.sort((a,b)=> new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime());

/* =====================
/* =====================
/* =====================
/* =====================
/* =====================
PROMOTOR RANKING
===================== */

const normalize = (text: any) =>
(text || "").toString().trim().toLowerCase();

const promotorRank = promotors
.map(p=>{

const namaPromotor = normalize(p.nama_promotor);

const dataPromotor = filteredData.filter(
d => normalize(d.promotor) === namaPromotor
);

const pengajuan = dataPromotor.length;

const pending = dataPromotor.filter(
d => normalize(d.status) === "pending"
).length;

const acc = dataPromotor.filter(
d => normalize(d.status).includes("clos")
).length;

const reject = dataPromotor.filter(
d => normalize(d.status) === "reject"
).length;

/* SUCCESS RATE */

const successRate = pengajuan
? Math.round((acc / pengajuan) * 100)
: 0;

return{
promotor:p.nama_promotor,
pengajuan,
pending,
acc,
reject,
successRate
};

})

/* RANKING BERDASARKAN JUMLAH PENGAJUAN */

.sort((a,b)=>b.pengajuan - a.pengajuan);

/* =====================
DEALER RANKING
===================== */

const dealerRank = tokos.map(t=>{

const dataDealer = filteredData.filter(
d=>d.toko===t.nama_toko
);

const pengajuan = dataDealer.length;

const pending = dataDealer.filter(
d=>d.status==="Pending"
).length;

const acc = dataDealer.filter(
d=>d.status==="Closing" || d.status==="Clos"
).length;

const reject = dataDealer.filter(
d=>d.status==="Reject"
).length;

const successRate = pengajuan
? Math.round((acc/pengajuan)*100)
:0;

return{
dealer:t.nama_toko,
pengajuan,
pending,
acc,
reject,
successRate
}

}).sort((a,b)=>b.pengajuan-a.pengajuan);

/* =====================
AI PREDIKSI
===================== */

const todayDay = new Date().getDate();
const daysMonth = new Date().getDate();

const avgClosing = monthClosing / todayDay;

const predictedClosing = Math.round(
avgClosing * 30
);

/* =====================
EXPORT EXCEL
===================== */

function exportExcel(){

const worksheet = XLSX.utils.json_to_sheet(filteredData);

const workbook = XLSX.utils.book_new();

XLSX.utils.book_append_sheet(workbook,worksheet,"report");

const excelBuffer = XLSX.write(workbook,{
bookType:"xlsx",
type:"array"
});

const blob = new Blob([excelBuffer],{
type:"application/octet-stream"
});

saveAs(blob,"report_kredit_vivo.xlsx");

}

/* =====================
UI
===================== */

return(

<div className="max-w-md mx-auto bg-gray-100 min-h-screen pb-24">

<div className="bg-gradient-to-r from-yellow-500 to-blue-500 text-white p-6 rounded-b-3xl">

<div className="flex items-center justify-between">

<h2 className="font-bold text-lg">
Dashboard Kredit Vivo Flores
</h2>

<img
src="/logo-vivo.png"
alt="Vivo Logo"
className="h-20 w-auto object-contain"
/>

</div>

</div>

{/* FILTER */}

<div className="flex gap-2 p-4 flex-wrap">

<select
className="border p-2 rounded"
value={monthFilter}
onChange={(e)=>setMonthFilter(e.target.value)}
>

<option value="">Semua Bulan</option>
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

<input
type="date"
value={dateFilter}
onChange={(e)=>setDateFilter(e.target.value)}
className="border p-2 rounded"
/>

<button
onClick={()=>setDateFilter("")}
className="bg-gray-400 text-white px-3 rounded"
>
Reset
</button>

<button
onClick={exportExcel}
className="bg-green-600 text-white px-3 rounded"
>
Export
</button>

</div>

{/* DASHBOARD */}

{tab==="dashboard" && (

<div>

{/* PROGRESS */}

<div className="bg-white rounded-2xl p-4 shadow mx-4 mt-4">

<h3 className="font-semibold mb-3">
Progress Hari Ini
</h3>

<div className="flex justify-center">

<ResponsiveContainer width={200} height={200}>

<PieChart>

<Pie
data={progressData}
innerRadius={60}
outerRadius={80}
dataKey="value"
>

{progressData.map((entry,index)=>(
<Cell key={index} fill={COLORS[index]} />
))}

</Pie>

</PieChart>

</ResponsiveContainer>

</div>

<p className="text-center text-3xl font-bold">
{totalToday}
</p>

<div className="grid grid-cols-3 gap-3 mt-4">

<div className="bg-blue-700 p-3 rounded text-center">
Closing
<p className="font-bold">{closing}</p>
</div>

<div className="bg-yellow-400 p-3 rounded text-center">
Pending
<p className="font-bold">{pending}</p>
</div>

<div className="bg-red-500 p-3 rounded text-center">
Reject
<p className="font-bold">{reject}</p>
</div>

</div>

</div>

{/* TARGET */}

<div className="bg-white p-4 rounded-2xl shadow mx-4 mt-4">

<h3 className="font-semibold mb-3">
Target Bulan Ini
</h3>

<h1 className="text-xl font-bold">
{monthInput} / {totalTarget}
</h1>

<div className="grid grid-cols-3 gap-2 mt-3 text-xs">

<div className="bg-blue-400 p-2 rounded text-center">
Closing:
<b>  {monthClosing}  </b>
</div>

<div className="bg-yellow-400 p-2 rounded text-center">
Pending:
<b>    {monthPending}    </b>
</div>

<div className="bg-red-600 p-2 rounded text-center">
Reject:
<b>  {monthReject}  </b>
</div>

</div>

</div>

{/* PERFORMA SATOR */}

<div className="mx-4 mt-4">

<h3 className="font-semibold mb-2">
Performa Sator
</h3>

{satorPerformance.map((s,i)=>(

<div key={i} className="bg-white p-4 rounded shadow mb-3">

<div className="flex justify-between">

<b>{s.sator}</b>
<span>{s.percent}%</span>

</div>

<p className="text-sm">
Input {s.input} / Target {s.target}
</p>

</div>

))}

</div>

{/* PERFORMA AREA */}

<div className="mx-4 mt-4">

<h3 className="font-semibold mb-2">
Performa Area
</h3>

{areaPerformance.map((a,i)=>(

<div key={i} className="bg-yellow p-4 rounded shadow mb-3">

<div className="flex justify-between">

<b>{a.area}</b>
<span>{a.percent}%</span>

</div>

<p className="text-sm">
Input {a.input} / Target {a.target}
</p>

</div>

))}

</div>

</div>

)}

{/* GRAFIK */}

{tab==="grafik" && (

<div className="mx-4 mt-4 space-y-4">

{/* FILTER TANGGAL */}

<div className="bg-white p-4 rounded-xl shadow">

<h3 className="font-semibold mb-3">
Filter Tanggal
</h3>

<div className="flex gap-2">

<input
type="date"
value={startDate}
onChange={(e)=>setStartDate(e.target.value)}
className="border rounded p-2 w-full"
/>

<input
type="date"
value={endDate}
onChange={(e)=>setEndDate(e.target.value)}
className="border rounded p-2 w-full"
/>

</div>

</div>

{/* GRAFIK */}

<div className="bg-white p-4 rounded-xl shadow">

<h3 className="font-semibold mb-3">
Grafik Input Harian
</h3>

<div className="h-64">

<ResponsiveContainer width="100%" height="100%">

<LineChart data={grafikHarian}>

<CartesianGrid strokeDasharray="3 3"/>

<XAxis dataKey="tanggal"/>

<YAxis/>

<Tooltip/>

<Line
type="monotone"
dataKey="total"
stroke="#3b82f6"
strokeWidth={3}
/>

</LineChart>

</ResponsiveContainer>

</div>

</div>

</div>

)}

{/* PROMOTOR */}

{tab==="promotor" && (

<div className="mx-4 mt-4">

<h3 className="font-bold mb-3">
Ranking Promotor
</h3>

{promotorRank.map((p,i)=>(

<div key={i} className="bg-white p-3 rounded shadow mb-2">

<div className="flex justify-between items-center">

<span className="font-semibold">
{i+1}. {p.promotor}
</span>

<span className="font-bold text-blue-600">
ACC: {p.acc}
</span>

</div>

<div className="text-xs mt-1 text-gray-600">

Pengajuan: {p.pengajuan} | 
Pending: {p.pending} | 
Reject: {p.reject} | 
Success: {p.successRate}%

</div>

</div>

))}

</div>

)}

{/* DEALER */}

{tab==="dealer" && (

<div className="mx-4 mt-4">

<h3 className="font-bold mb-3">
Leaderboard Dealer
</h3>

{dealerRank.map((d,i)=>(

<div key={i} className="bg-white p-3 rounded shadow mb-2">

<div className="flex justify-between font-semibold">

<span>{i+1}. {d.dealer}</span>

<span className="text-blue-600">ACC: {d.acc}</span>

</div>

<div className="text-xs text-gray-600 mt-1">

Pengajuan: {d.pengajuan} | Pending: {d.pending} | Reject: {d.reject} | Success: {d.successRate}%

</div>

</div>

))}

</div>

)}

{/* AI */}

{tab==="ai" && (

<div className="mx-4 mt-4">

<h3 className="font-bold mb-3">
AI Prediksi Closing
</h3>

<div className="bg-white p-4 rounded shadow">

Prediksi Closing Bulan Ini

<h1 className="text-2xl font-bold">
{predictedClosing}
</h1>

</div>

</div>

)}

{/* NAVIGATION */}

<div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white shadow p-3 flex justify-around">

<button onClick={()=>setTab("dashboard")}>
🏠
<p className="text-xs">Dashboard</p>
</button>

<button onClick={()=>setTab("grafik")}>
📊
<p className="text-xs">Grafik</p>
</button>

<button onClick={()=>setTab("promotor")}>
👥
<p className="text-xs">Promotor</p>
</button>

<button onClick={()=>setTab("dealer")}>
🏪
<p className="text-xs">Dealer</p>
</button>

<button onClick={()=>setTab("ai")}>
🤖
<p className="text-xs">AI</p>
</button>

</div>

</div>

);

}
"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function InputPage() {

const [tanggal,setTanggal]=useState("");

const [sators,setSators]=useState<any[]>([]);
const [tokos,setTokos]=useState<any[]>([]);
const [promotors,setPromotors]=useState<any[]>([]);

const [area,setArea]=useState("");
const [sator,setSator]=useState("");
const [toko,setToko]=useState("");
const [promotor,setPromotor]=useState("");

const [konsumen,setKonsumen]=useState("");
const [typeHp,setTypeHp]=useState("");
const [hargaHp,setHargaHp]=useState("");
const [leasing,setLeasing]=useState("");
const [limitKredit,setLimitKredit]=useState("");
const [status,setStatus]=useState("Pending");

useEffect(()=>{
loadSator();
},[]);


async function loadSator(){

const { data } = await supabase
.from("sators")
.select("*");

if(data) setSators(data);

}


async function loadToko(selectedSator:string){

setSator(selectedSator);

const satorData = sators.find(s=>s.nama_sator===selectedSator);

if(satorData){
setArea(satorData.area);
}

const { data } = await supabase
.from("tokos")
.select("*")
.eq("sator",selectedSator);

if(data) setTokos(data);

}


async function loadPromotor(selectedToko:string){

setToko(selectedToko);

const { data } = await supabase
.from("promotors")
.select("*")
.eq("nama_toko",selectedToko);

if(data) setPromotors(data);

}



const submitData = async () => {

const { error } = await supabase
.from("kredit_vast")
.insert([{

tanggal,
area,
sator,
toko,
promotor,
konsumen,
type_hp:typeHp,
harga_hp:hargaHp,
leasing,
limit_kredit:limitKredit,
status

}]);


if(error){
console.log(error);
alert("Error menyimpan data");
}else{
alert("Data berhasil disimpan");
}

};



return (

<div className="p-10 max-w-xl">

<h1 className="text-2xl font-bold mb-5">
Input Kredit Promotor
</h1>

<input
type="date"
className="border p-2 mb-2 w-full"
onChange={(e)=>setTanggal(e.target.value)}
/>


<select
className="border p-2 mb-2 w-full"
onChange={(e)=>loadToko(e.target.value)}
>

<option>Pilih SATOR</option>

{sators.map((s)=>(
<option key={s.id}>{s.nama_sator}</option>
))}

</select>


<select
className="border p-2 mb-2 w-full"
onChange={(e)=>loadPromotor(e.target.value)}
>

<option>Pilih Toko</option>

{tokos.map((t)=>(
<option key={t.id}>{t.nama_toko}</option>
))}

</select>


<select
className="border p-2 mb-2 w-full"
onChange={(e)=>setPromotor(e.target.value)}
>

<option>Pilih Promotor</option>

{promotors.map((p)=>(
<option key={p.id}>{p.nama_promotor}</option>
))}

</select>


<input
className="border p-2 mb-2 w-full"
placeholder="Nama Konsumen"
onChange={(e)=>setKonsumen(e.target.value)}
/>

<input
className="border p-2 mb-2 w-full"
placeholder="Pekerjaan"
onChange={(e)=>setKonsumen(e.target.value)}
/>

<input
className="border p-2 mb-2 w-full"
placeholder="No.HP Konsumen"
onChange={(e)=>setKonsumen(e.target.value)}
/>

<input
className="border p-2 mb-2 w-full"
placeholder="Type HP"
onChange={(e)=>setTypeHp(e.target.value)}
/>


<input
className="border p-2 mb-2 w-full"
placeholder="Harga HP"
onChange={(e)=>setHargaHp(e.target.value)}
/>


<input
className="border p-2 mb-2 w-full"
placeholder="Leasing"
onChange={(e)=>setLeasing(e.target.value)}
/>


<input
className="border p-2 mb-2 w-full"
placeholder="Limit Kredit"
onChange={(e)=>setLimitKredit(e.target.value)}
/>


<select
className="border p-2 mb-4 w-full"
onChange={(e)=>setStatus(e.target.value)}
>

<option value="Pending">Pending</option>
<option value="Clossing">Clossing</option>
<option value="Reject">Reject</option>

</select>


<button
onClick={submitData}
className="bg-blue-500 text-white px-4 py-2 w-full"
>
Submit
</button>


</div>

);

}
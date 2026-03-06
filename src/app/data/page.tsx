"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function DataPage() {

const [data,setData]=useState<any[]>([]);

useEffect(()=>{
loadData();
},[]);

async function loadData(){

const { data,error } = await supabase
.from("kredit_vast")
.select("*")
.order("created_at",{ascending:false});

if(data){
setData(data);
}

}

return(

<div className="p-10">

<h1 className="text-2xl font-bold mb-5">
Data Kredit
</h1>

<table className="border">

<thead>
<tr>
<th className="border p-2">Konsumen</th>
<th className="border p-2">Toko</th>
<th className="border p-2">Status</th>
</tr>
</thead>

<tbody>

{data.map((item,i)=>(
<tr key={i}>
<td className="border p-2">{item.konsumen}</td>
<td className="border p-2">{item.toko}</td>
<td className="border p-2">{item.status}</td>
</tr>
))}

</tbody>

</table>

</div>

);

}
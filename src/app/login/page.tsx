"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function Login(){

const router = useRouter();

const [email,setEmail]=useState("");
const [password,setPassword]=useState("");

async function login(){

const { error } = await supabase.auth.signInWithPassword({
email,
password
});

if(error){
alert("Login gagal");
}else{
router.push("/dashboard");
}

}

return(

<div className="p-10 max-w-md mx-auto">

<h1 className="text-2xl font-bold mb-5">
Login Sistem Kredit
</h1>

<input
className="border p-2 mb-3 w-full"
placeholder="Email"
onChange={(e)=>setEmail(e.target.value)}
/>

<input
type="password"
className="border p-2 mb-3 w-full"
placeholder="Password"
onChange={(e)=>setPassword(e.target.value)}
/>

<button
onClick={login}
className="bg-blue-600 text-white px-4 py-2"
>
Login
</button>

</div>

);

}
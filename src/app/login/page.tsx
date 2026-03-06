"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function Login() {

const router = useRouter();

const [email,setEmail] = useState("");
const [password,setPassword] = useState("");
const [loading,setLoading] = useState(false);

async function handleLogin(){

setLoading(true);

const { data, error } = await supabase.auth.signInWithPassword({
email,
password,
});

if(error){
alert("Login gagal");
setLoading(false);
return;
}

if(email === "manager@vivo.com"){
router.push("/dashboard");
}else{
router.push("/input");
}

}

return(

<div className="flex items-center justify-center h-screen bg-gray-100">

<div className="bg-white p-10 rounded-xl shadow-xl w-80">

<h1 className="text-xl font-bold mb-6 text-center">
Login Kredit Vivo
</h1>

<input
className="border w-full p-2 mb-3"
placeholder="Email"
onChange={(e)=>setEmail(e.target.value)}
/>

<input
type="password"
className="border w-full p-2 mb-5"
placeholder="Password"
onChange={(e)=>setPassword(e.target.value)}
/>

<button
onClick={handleLogin}
className="bg-blue-600 text-white w-full p-2 rounded"
>

{loading ? "Loading..." : "Login"}

</button>

</div>

</div>

);

}
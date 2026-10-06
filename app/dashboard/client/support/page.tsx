"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { supabase } from "@/lib/supabase";
import Link from "next/link";


export default function ClientSupportPage() {
  const { user, isLoaded } = useUser();
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function fetchMessages() {
      const email = user?.primaryEmailAddress?.emailAddress;
      if (!email) return setLoading(false);

      try {
        const { data: customer } = await supabase
          .from('customers')
          .select('id')
          .eq('email', email)
          .single();

        if (customer) {
          // Fetch messages (Mocked for now as we might need a messages table)
          // In a real app, we'd join with employees to get the responder's name
          const { data: msgs } = await supabase
            .from('messages')
            .select('*')
            .eq('customer_id', customer.id)
            .order('created_at', { ascending: true });

          setMessages(msgs || []);
        }
      } catch (err) {
        console.error("Error fetching messages:", err);
      } finally {
        setLoading(false);
      }
    }

    if (isLoaded) fetchMessages();
  }, [user, isLoaded]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    setSubmitting(true);

    try {
      const { data: customer } = await supabase
        .from('customers')
        .select('id')
        .eq('email', user?.primaryEmailAddress?.emailAddress)
        .single();
      
      if (customer) {
        const { error } = await supabase
          .from('messages')
          .insert([{
            customer_id: customer.id,
            content: newMessage,
            sender_id: user?.id,
            sender_type: 'client'
          }]);

        if (error && error.code !== '42P01') throw error;
        
        // Optimistic update
        const newMsg = {
          content: newMessage,
          sender_type: 'client',
          created_at: new Date().toISOString()
        };
        setMessages([...messages, newMsg]);
        setNewMessage("");
      }
    } catch (err: any) {
      alert("Error sending message: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isLoaded || loading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto h-[calc(100vh-160px)] flex flex-col space-y-10 pb-10 font-sans animate-in fade-in duration-700">
      
      {/* Navigation Tabs */}
      <div className="flex items-center gap-8 border-b border-slate-100 pb-1">
        {[
          { name: "Overview", href: "/dashboard" },
          { name: "Requests", href: "/dashboard/client/requests" },
          { name: "Activity", href: "/dashboard/client/activity" },
          { name: "Profile", href: "/dashboard/client/profile" }
        ].map((tab) => (
          <Link
            key={tab.name}
            href={tab.href}
            className={`pb-4 text-[13px] font-bold border-b-2 transition-all ${
              tab.name === "Support" 
                ? "border-accent text-slate-900" 
                : "border-transparent text-slate-600 hover:text-slate-600 hover:border-slate-200"
            }`}
          >
            {tab.name}
          </Link>
        ))}
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
        <div className="space-y-1">
          <h1 className="text-[32px] font-bold text-slate-900 tracking-tight leading-none">Contact Support</h1>
          <p className="text-slate-600 font-bold text-[11px] tracking-widest">Get assistance from our team</p>
        </div>

      </div>

      <div className="flex-1 bg-white border border-slate-200 rounded-3xl flex flex-col overflow-hidden relative shadow-sm">
        
        {/* Messages List */}
        <div className="flex-1 overflow-y-auto p-10 space-y-10 relative z-10 scrollbar-hide">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-6">
               <div className="w-16 h-16 border border-slate-100 rounded-2xl flex items-center justify-center text-slate-200 shadow-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
               </div>
                <div className="space-y-2">
                   <h3 className="text-[14px] font-bold text-slate-900 tracking-widest">Hi {user?.firstName || 'there'}, how can we help you today?</h3>
                   <p className="text-[11px] font-medium text-slate-600 max-w-sm leading-relaxed tracking-tight">Tell us your account ID and other details to get help from Verkwa support</p>
                </div>
            </div>
          ) : (
            messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.sender_type === 'client' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-400`}>
                <div className={`max-w-[75%] space-y-3`}>
                   <div className={`p-6 rounded-2xl shadow-sm transition-all text-[15px] font-medium leading-relaxed tracking-tight ${
                     msg.sender_type === 'client' 
                     ? 'bg-slate-900 text-white rounded-br-none' 
                     : 'bg-slate-50 text-slate-800 border border-slate-100 rounded-bl-none'
                   }`}>
                      {msg.content}
                   </div>
                   <div className={`flex items-center gap-3 ${msg.sender_type === 'client' ? 'flex-row-reverse' : 'flex-row'}`}>
                      <p className={`text-[10px] font-bold tracking-widest uppercase ${msg.sender_type === 'client' ? 'text-slate-900' : 'text-slate-600'}`}>
                         {msg.sender_type === 'client' ? 'Secured node' : 'HQ operative'}
                      </p>
                      <div className="w-1 h-1 bg-slate-200 rounded-full" />
                      <p className="text-[10px] font-bold tracking-tighter text-slate-300">
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                   </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Input Area */}
        <div className="p-8 bg-slate-50 border-t border-slate-100 relative z-10">
           <form onSubmit={sendMessage} className="flex gap-4">
              <input 
                type="text" 
                placeholder="Enter message ..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="flex-1 px-8 py-5 bg-white border border-slate-100 text-[14px] font-bold text-slate-900 focus:outline-none focus:border-slate-900 transition-all placeholder:text-slate-200 tracking-tight rounded-2xl shadow-sm"
              />
              <button 
                type="submit"
                disabled={submitting || !newMessage.trim()}
                className="w-16 h-16 bg-slate-900 text-white flex items-center justify-center rounded-2xl hover:bg-black transition-all active:scale-[0.95] disabled:bg-slate-100 shadow-xl relative group"
              >
                 <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
              </button>
           </form>
        </div>
      </div>

    </div>
  );
}

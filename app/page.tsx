'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Send, Plus, Trash2, Edit2, Download, Upload, Dog, Calendar, ShoppingCart, Globe, CheckCircle } from 'lucide-react';

// Replace with your actual Supabase URL and anon key (use .env in production!)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Anthropic API key (MUST be handled server-side in production - shown here for demo only)
const ANTHROPIC_API_KEY = process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY || 'your-anthropic-key';

interface Puppy {
  id: string;
  name: string;
  breed: string;
  color: string;
  gender: 'Male' | 'Female';
  dob: string;
  litter_id: string;
  gooddog_id?: string;
  status: 'Available' | 'Reserved' | 'Sold' | 'Archived';
  price: number;
  description?: string;
  images?: string[];
}

interface Litter {
  id: string;
  name: string;
  dam: string;
  sire: string;
  expected_dob?: string;
  actual_dob?: string;
  puppies_count: number;
}

interface Task {
  id: string;
  title: string;
  due_date?: string;
  completed: boolean;
  category: 'Breeding' | 'E-commerce' | 'Web Hosting' | 'Personal';
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function ClaudePersonalAssistant() {
  const [puppies, setPuppies] = useState<Puppy[]>([]);
  const [litters, setLitters] = useState<Litter[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'puppies' | 'litters' | 'tasks' | 'chat'>('dashboard');
  
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Hello! I\'m Claude, your personal AI assistant for the dog breeding, e-commerce, and web hosting businesses. How can I help you today? (I can track puppies, sync GoodDog data, manage tasks, etc.)' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importData, setImportData] = useState('');
  const [importType, setImportType] = useState<'csv' | 'json'>('csv');

  // Load data from Supabase
  useEffect(() => {
    fetchPuppies();
    fetchLitters();
    fetchTasks();
  }, []);

  const fetchPuppies = async () => {
    const { data, error } = await supabase.from('puppies').select('*').order('dob', { ascending: false });
    if (error) console.error('Supabase error:', error);
    else setPuppies(data || []);
  };

  const fetchLitters = async () => {
    const { data, error } = await supabase.from('litters').select('*');
    if (error) console.error(error);
    else setLitters(data || []);
  };

  const fetchTasks = async () => {
    const { data, error } = await supabase.from('tasks').select('*').order('due_date');
    if (error) console.error(error);
    else setTasks(data || []);
  };

  // Add puppy (called by AI or manual)
  const addPuppy = async (puppy: Omit<Puppy, 'id'>) => {
    const { error } = await supabase.from('puppies').insert([puppy]);
    if (!error) fetchPuppies();
    return !error;
  };

  const removePuppy = async (id: string) => {
    const { error } = await supabase.from('puppies').delete().eq('id', id);
    if (!error) fetchPuppies();
  };

  const updatePuppyStatus = async (id: string, status: Puppy['status']) => {
    const { error } = await supabase.from('puppies').update({ status }).eq('id', id);
    if (!error) fetchPuppies();
  };

  // Simple CSV parser for GoodDog copy-paste (user can copy table from dashboard or export manually)
  const parseGoodDogCSV = (csvText: string): Omit<Puppy, 'id'>[] => {
    const lines = csvText.trim().split('\n');
    const puppies: Omit<Puppy, 'id'>[] = [];
    
    // Skip header, assume columns: Name,Breed,Color,Gender,DOB,Litter,GoodDogID,Price,Description
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
      if (cols.length < 5) continue;
      
      puppies.push({
        name: cols[0],
        breed: cols[1] || 'Unknown',
        color: cols[2] || '',
        gender: (cols[3] as any) || 'Male',
        dob: cols[4],
        litter_id: cols[5] || 'unknown',
        gooddog_id: cols[6] || undefined,
        status: 'Available',
        price: parseFloat(cols[7]) || 2500,
        description: cols[8] || '',
      });
    }
    return puppies;
  };

  const handleImportFromGoodDog = async () => {
    let newPuppies: Omit<Puppy, 'id'>[] = [];
    
    if (importType === 'csv') {
      newPuppies = parseGoodDogCSV(importData);
    } else {
      try {
        newPuppies = JSON.parse(importData);
      } catch (e) {
        alert('Invalid JSON');
        return;
      }
    }

    if (newPuppies.length === 0) {
      alert('No puppies parsed');
      return;
    }

    let success = 0;
    for (const pup of newPuppies) {
      const ok = await addPuppy(pup);
      if (ok) success++;
    }

    alert(`Successfully imported ${success} puppies from GoodDog to your Supabase puppy portal!`);
    setImportModalOpen(false);
    setImportData('');
    fetchPuppies();
  };

  // Claude chat with basic tool calling simulation (full agent loop in production via API route)
  const sendMessage = async () => {
    if (!input.trim()) return;
    
    const userMsg = { role: 'user' as const, content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    const newMessages = [...messages, userMsg];

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 2000,
          temperature: 0.7,
          system: `You are Claude, an expert AI personal assistant and agent for a dog breeding business (puppy sales via GoodDog + own portal), e-commerce store, and web hosting company.
You keep track of EVERYTHING behind the scenes.
Available tools (when user asks to add/remove/sync puppies, use them by outputting exactly in this format before your response):

TOOL:ADD_PUPPY|{"name":"...", "breed":"...", ...} (full puppy object)
TOOL:REMOVE_PUPPY|puppy-id-or-name
TOOL:UPDATE_STATUS|puppy-id|new-status
TOOL:LIST_PUPPIES (then I'll show you the list)
TOOL:ADD_TASK|{"title":"...", "category":"Breeding", "due_date":"2026-03-01"}

Your goal: sync GoodDog → Supabase puppy portal automatically when user pastes data or says "sync litter X". Be proactive, track inventory, sales, website updates, tasks, etc.`,
          messages: newMessages
        })
      });

      const data = await response.json();
      let assistantReply = data.content[0].text;

      // Simple tool parsing (in production move to secure API route + full loop)
      if (assistantReply.includes('TOOL:')) {
        const toolMatch = assistantReply.match(/TOOL:([A-Z_]+)\|(.*)/);
        if (toolMatch) {
          const [_, toolName, toolPayload] = toolMatch;
          assistantReply = assistantReply.replace(/TOOL:.*$/m, '').trim();

          if (toolName === 'ADD_PUPPY') {
            try {
              const pupData = JSON.parse(toolPayload);
              await addPuppy(pupData);
              assistantReply += '\n\n✅ Puppy added to Supabase and live on your puppy portal/website!';
            } catch (e) {}
          } else if (toolName === 'REMOVE_PUPPY') {
            // Find by name or ID (simple)
            const pup = puppies.find(p => p.id === toolPayload || p.name.toLowerCase() === toolPayload.toLowerCase());
            if (pup) {
              await removePuppy(pup.id);
              assistantReply += '\n\n✅ Puppy removed from portal.';
            }
          } else if (toolName === 'UPDATE_STATUS') {
            const [id, status] = toolPayload.split('|');
            await updatePuppyStatus(id, status as any);
            assistantReply += '\n\n✅ Status updated on website.';
          }
          // Add more tool handlers as needed
        }
      }

      setMessages(prev => [...prev, { role: 'assistant', content: assistantReply }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I hit a rate limit or API issue. Try again or use the manual puppy tools above.' }]);
    }

    setIsLoading(false);
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex h-screen bg-zinc-950 text-white">
      {/* Sidebar */}
      <div className="w-64 bg-zinc-900 border-r border-zinc-800 flex flex-col">
        <div className="p-6 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <Dog className="w-8 h-8 text-amber-400" />
            <div>
              <h1 className="text-2xl font-bold">Claude Agent</h1>
              <p className="text-xs text-zinc-500">Your 24/7 Business Brain</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: CheckCircle },
            { id: 'puppies', label: 'Puppy Portal Sync', icon: Dog },
            { id: 'litters', label: 'Litters', icon: Calendar },
            { id: 'tasks', label: 'Tasks & Ops', icon: ShoppingCart },
            { id: 'chat', label: 'Talk to Claude', icon: Send },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl mb-1 transition ${activeTab === tab.id ? 'bg-amber-500 text-black' : 'hover:bg-zinc-800'}`}
            >
              <tab.icon className="w-5 h-5" />
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-zinc-800 text-xs text-zinc-500">
          Works behind the scenes • GoodDog → Supabase sync • All data in your control
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="h-16 border-b border-zinc-800 bg-zinc-900 flex items-center px-8 justify-between">
          <h2 className="text-xl font-semibold capitalize">{activeTab}</h2>
          <div className="flex items-center gap-4 text-sm">
            <div className="px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center gap-1">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              Claude Online
            </div>
          </div>
        </div>

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="p-8 overflow-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-zinc-900 rounded-3xl p-8">
                <div className="text-5xl font-bold mb-2">{puppies.filter(p => p.status === 'Available').length}</div>
                <div className="text-zinc-400">Puppies Available (Synced to portal)</div>
              </div>
              <div className="bg-zinc-900 rounded-3xl p-8">
                <div className="text-5xl font-bold mb-2">{litters.length}</div>
                <div className="text-zinc-400">Active Litters</div>
              </div>
              <div className="bg-zinc-900 rounded-3xl p-8">
                <div className="text-5xl font-bold mb-2">{tasks.filter(t => !t.completed).length}</div>
                <div className="text-zinc-400">Open Tasks</div>
              </div>
            </div>

            <div className="mt-10">
              <h3 className="text-lg mb-4">Quick GoodDog → Portal Sync</h3>
              <button
                onClick={() => setImportModalOpen(true)}
                className="flex items-center gap-3 bg-amber-500 hover:bg-amber-600 text-black px-8 py-4 rounded-2xl font-medium"
              >
                <Upload className="w-5 h-5" />
                Import Litter/Puppies from GoodDog (CSV or JSON paste)
              </button>
              <p className="text-xs text-zinc-500 mt-3">Copy table from GoodDog dashboard → paste here. I\'ll parse and push to Supabase instantly.</p>
            </div>
          </div>
        )}

        {/* Puppies Tab - Live Portal Data */}
        {activeTab === 'puppies' && (
          <div className="p-8 overflow-auto">
            <div className="flex justify-between mb-6">
              <h3 className="text-2xl">Puppy Portal ({puppies.length} total)</h3>
              <button
                onClick={() => setImportModalOpen(true)}
                className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 px-6 py-3 rounded-xl"
              >
                <Upload className="w-4 h-4" /> Sync from GoodDog
              </button>
            </div>

            <div className="bg-zinc-900 rounded-3xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="text-left p-6">Name</th>
                    <th className="text-left p-6">Litter</th>
                    <th className="text-left p-6">GoodDog ID</th>
                    <th className="text-left p-6">Status</th>
                    <th className="text-left p-6">Price</th>
                    <th className="w-32"></th>
                  </tr>
                </thead>
                <tbody>
                  {puppies.map(pup => (
                    <tr key={pup.id} className="border-b border-zinc-800 hover:bg-zinc-800/50">
                      <td className="p-6 font-medium">{pup.name}</td>
                      <td className="p-6 text-zinc-400">{pup.litter_id}</td>
                      <td className="p-6 text-amber-400 font-mono text-sm">{pup.gooddog_id || '—'}</td>
                      <td className="p-6">
                        <select 
                          value={pup.status}
                          onChange={(e) => updatePuppyStatus(pup.id, e.target.value as any)}
                          className="bg-zinc-800 text-sm px-3 py-1 rounded-lg"
                        >
                          {['Available','Reserved','Sold','Archived'].map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </td>
                      <td className="p-6 font-mono">${pup.price}</td>
                      <td className="p-6 flex gap-2">
                        <button onClick={() => removePuppy(pup.id)} className="text-red-400 hover:text-red-500">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Litters & Tasks tabs (simple placeholders - extend similarly) */}
        {activeTab === 'litters' && <div className="p-8">Litters management (add similar Supabase table + UI)</div>}
        {activeTab === 'tasks' && <div className="p-8">All tasks across breeding, e-comm, hosting</div>}

        {/* Chat Tab - The AI Agent Core */}
        {activeTab === 'chat' && (
          <div className="flex-1 flex flex-col">
            <div className="flex-1 p-8 overflow-auto space-y-8" id="chat-window">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-3xl px-6 py-4 rounded-3xl ${msg.role === 'user' ? 'bg-amber-500 text-black' : 'bg-zinc-900'}`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {isLoading && <div className="text-zinc-500">Claude is thinking...</div>}
              <div ref={chatEndRef} />
            </div>

            <div className="p-6 border-t border-zinc-800 bg-zinc-900">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Tell Claude anything (e.g. 'Sync my new litter from GoodDog', 'Remove puppy Luna', 'List all available puppies', 'Remind me to update website hosting')"
                  className="flex-1 bg-zinc-800 border border-zinc-700 rounded-2xl px-6 py-4 focus:outline-none focus:border-amber-500"
                />
                <button
                  onClick={sendMessage}
                  disabled={isLoading}
                  className="bg-amber-500 hover:bg-amber-600 text-black px-8 rounded-2xl flex items-center gap-2 disabled:opacity-50"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
              <p className="text-center text-[10px] text-zinc-600 mt-3">Claude has direct Supabase tools — just ask!</p>
            </div>
          </div>
        )}
      </div>

      {/* Import Modal */}
      {importModalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-zinc-900 rounded-3xl w-[620px] p-8">
            <h3 className="text-2xl mb-6">GoodDog → Your Puppy Portal Sync</h3>
            
            <div className="flex gap-4 mb-6">
              <button onClick={() => setImportType('csv')} className={`flex-1 py-3 rounded-2xl ${importType === 'csv' ? 'bg-amber-500 text-black' : 'bg-zinc-800'}`}>CSV (copy table)</button>
              <button onClick={() => setImportType('json')} className={`flex-1 py-3 rounded-2xl ${importType === 'json' ? 'bg-amber-500 text-black' : 'bg-zinc-800'}`}>JSON</button>
            </div>

            <textarea
              value={importData}
              onChange={(e) => setImportData(e.target.value)}
              placeholder={importType === 'csv' ? 
                "Name,Breed,Color,Gender,DOB,Litter,GoodDogID,Price,Description\nLuna,Golden Retriever,Cream,Female,2026-01-15,Litter-A,GD-39281,3200,Super sweet girl..." 
                : '[{"name":"Luna", "breed":"Golden Retriever", ...}]'}
              className="w-full h-72 bg-zinc-950 border border-zinc-700 rounded-2xl p-6 font-mono text-sm resize-none"
            />

            <div className="flex gap-4 mt-8">
              <button onClick={() => setImportModalOpen(false)} className="flex-1 py-4 border border-zinc-700 rounded-2xl">Cancel</button>
              <button onClick={handleImportFromGoodDog} className="flex-1 py-4 bg-amber-500 hover:bg-amber-600 text-black rounded-2xl font-medium">Sync to Supabase + Website</button>
            </div>
            <p className="text-center text-xs text-zinc-500 mt-4">Puppies appear instantly on your public puppy portal (Supabase-powered)</p>
          </div>
        </div>
      )}
    </div>
  );
}
'use strict';
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const KEY = 'yuxing.diary.v1';
const PREF = 'yuxing.preferences.v1';
const names = {fish:'小鱼',star:'星星'};
const moodSymbols = {晴朗:'☀',平静:'☁',低落:'☂',疲惫:'☾'};
const greetings = {fish:'嗨，我是小鱼。\n今天的海很安静，我也有空听你说话。\n有什么开心的、委屈的，或者说不清的心情，都可以告诉我。',star:'我是星星，今天也为你亮着。\n不用整理好心情再来，你现在的样子就很好。\n想从哪一件小事说起呢？'};
let sessions = [], prefs = {}, companion = 'fish', mood = '平静', current = null, openedEntry = null;
let storageAvailable = true;
try { sessions = validateEntries(JSON.parse(localStorage.getItem(KEY) || '[]')); prefs = JSON.parse(localStorage.getItem(PREF) || '{}') || {}; } catch { toast('日记暂时无法读取，请先导出备份，避免覆盖原记录。'); storageAvailable = false; }
function uid(){return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;}
function dateText(value){return new Date(value).toLocaleDateString('zh-CN',{year:'numeric',month:'long',day:'numeric'});}
function validateEntries(data){
  if (!Array.isArray(data) || data.length > 5000) throw Error('日记格式不正确');
  return data.map(e => {
    if (!e || typeof e.id !== 'string' || e.id.length > 100 || !Number.isFinite(Date.parse(e.createdAt)) || !Array.isArray(e.messages) || e.messages.length > 10000 || !e.messages.length) throw Error('日记格式不正确');
    const messages = e.messages.map(m => {
      if (!m || !['user','assistant'].includes(m.role) || typeof m.text !== 'string' || m.text.length > 12000 || !['fish','star'].includes(m.companion)) throw Error('日记格式不正确');
      return {role:m.role,text:m.text,companion:m.companion};
    });
    return {id:e.id,createdAt:e.createdAt,mood:Object.hasOwn(moodSymbols,e.mood)?e.mood:'平静',messages};
  });
}
function toast(message){ $('#toast').textContent = message; $('#toast').classList.add('show'); clearTimeout(toast.timer); toast.timer=setTimeout(()=>$('#toast').classList.remove('show'),4200); }
function save(){
  if (!storageAvailable){toast('本次对话尚未保存，请用日记页的导出功能备份。'); return false;}
  try{localStorage.setItem(KEY,JSON.stringify(sessions));$('#save-status').textContent='♡ 已自动保存，只留在这台设备';updateCount();return true;}
  catch{toast('设备存储空间不足，请立即导出日记备份。');$('#save-status').textContent='尚未保存，请导出备份';return false;}
}
function savePrefs(){try{localStorage.setItem(PREF,JSON.stringify(prefs));}catch{toast('偏好设置无法保存到当前浏览器。');}}
function updateCount(){ $('#diary-count').textContent=sessions.length; }
function appendMessage(container,message){
  const el=document.createElement('div');el.className=`message ${message.role==='user'?'user':message.companion==='star'?'star-message':''}`;
  if(message.role!=='user'){const avatar=document.createElement('span');avatar.className=`avatar ${message.companion}-avatar`;avatar.textContent=message.companion==='fish'?'𓆝':'✦';el.append(avatar);}
  const content=document.createElement('div');content.className='message-content';
  const label=document.createElement('div');label.className='message-name';label.textContent=message.role==='user'?'你':names[message.companion];
  const bubble=document.createElement('div');bubble.className='bubble';bubble.textContent=message.text;
  content.append(label,bubble);el.append(content);container.append(el);return el;
}
function renderChat(){
  $('#messages').replaceChildren();
  const messages=current?current.messages:[{role:'assistant',text:greetings[companion],companion}];
  messages.forEach(m=>appendMessage($('#messages'),m));
  $('#chat-date').textContent=dateText(current?current.createdAt:Date.now());
  $('#messages').scrollTop=$('#messages').scrollHeight;
}
function selectCompanion(value){
  companion=value;$$('.companion').forEach(el=>{el.classList.toggle('selected',el.dataset.companion===value);el.setAttribute('aria-pressed',String(el.dataset.companion===value));});
  if(!current)renderChat();else toast(`${names[value]}来陪你了，下一条心事可以说给它听。`);
}
$$('.companion').forEach(el=>el.addEventListener('click',()=>selectCompanion(el.dataset.companion)));
function setMood(value){mood=value;$$('#moods button').forEach(el=>{el.classList.toggle('chosen',el.dataset.mood===value);el.setAttribute('aria-pressed',String(el.dataset.mood===value));});$('#mood-label').textContent=value;if(current){current.mood=value;save();}}
$$('#moods button').forEach(el=>el.addEventListener('click',()=>setMood(el.dataset.mood)));
function newChat(){current=null;renderChat();$('#message-input').value='';$('#save-status').textContent='♡ 只保存在这台设备，只有你能翻阅';navigate('home');$('#message-input').focus();}
$('#new-chat').addEventListener('click',newChat);$('#write-diary').addEventListener('click',newChat);
function reply(text,who,entry){
  const n=entry.messages.filter(m=>m.role==='user').length;
  const fish=who==='fish';
  if(/自杀|自残|不想活|结束生命|伤害自己/.test(text))return '听起来你此刻承受了很多。我很在意你的安全。请先到有人陪伴的地方，把可能伤害自己的东西放远，联系一个信任的人，直接告诉对方“我现在需要你陪着我”。如果你已经受伤，或可能马上伤害自己，请立即联系当地急救或前往最近的急诊。这里的预设回应无法提供紧急支持，但你值得得到真实的人及时的帮助。';
  const rules=[
    [/生日|长大|一岁/,fish?'生日快乐呀。今天的小鱼为你多吐一个心愿泡泡。新的一岁，你最想送给自己什么呢？':'今天有一颗星星专门为你亮着。生日快乐。愿你的愿望被认真对待，也愿你记得照顾自己。想许下什么愿望呢？'],
    [/谢谢|感谢/,fish?'不用谢，我就在这片小小的海里。愿意把心事说出来，本身就很不容易。还想再坐一会儿吗？':'你的话我听见啦。也谢谢你愿意在这里停一停。今晚，可以给自己留一点温柔吗？'],
    [/孤独|寂寞|没人|一个人|不被理解/,fish?'一个人撑着的时候，心里会很空吧。先在这里歇一会儿。如果愿意，也可以找一个信任的人说说近况。你最希望被听见的，是哪句话呢？':'有些时候，身边很热闹，心里还是会孤单。不被理解的感觉很难受。你愿意说说，今天什么时候这种感觉最强烈吗？'],
    [/累|疲惫|压力|忙|作业|工作|考试/,fish?'听起来你已经游了很久。先不急着抵达岸边，喝口水，松一松肩膀。今天最让你觉得累的是哪一件事？':'电量低的时候，不必要求自己一直发光。试着给自己留十分钟休息吧。如果只能暂时放下一件事，你想先放下什么？'],
    [/难过|伤心|哭|委屈|低落|不开心|烦|难受/,fish?'这些心情可以在这里待着，不用急着赶走。要是想哭，也可以哭一会儿。我会安静地陪你。愿意从让你难受的那一刻说起吗？':'难过不代表你做得不好，也不需要马上找到答案。先把这一刻交给星光。你现在更想被安慰，还是想慢慢理一理发生了什么？'],
    [/焦虑|害怕|担心|紧张|失眠|睡不着/,fish?'心里像有很多小浪花，一时停不下来，对吗？可以试试脚踩地面，慢慢呼吸，看看周围的三样东西。此刻你最担心的是什么？':'有时候还没发生的事，会先在心里下起雨。我们先回到眼前这一分钟。有什么很小的事，能让你现在稍微安心一点呢？'],
    [/生气|讨厌|吵架|愤怒/,fish?'生气的时候，可以先不用装作没关系。把这口气慢慢呼出去，等浪小一点再决定要怎么说。是哪件事碰到了你的底线？':'你的不舒服值得被认真对待。先给自己一点空间，暂时不用急着回应别人。你希望对方理解什么呢？'],
    [/开心|高兴|快乐|幸福|喜欢|好消息|成功/,fish?'感觉海面也跟着亮了一点。这样的小小快乐，值得好好收进日记里。可以多讲一点吗？你最想记住哪个瞬间？':'收到一颗亮晶晶的好心情！替你把这一刻放进星星口袋。回头再看时，希望你还能想起现在的笑容。想怎样小小庆祝一下呢？']
  ];
  const rule=rules.find(([pattern])=>pattern.test(text));if(rule)return rule[1];
  const previous=entry.messages.filter(m=>m.role==='user').slice(-2,-1)[0];
  if(previous && previous.text===text)return fish?'这句话你又说了一遍，或许它在你心里真的很重要。你最想让谁认真听见它呢？':'有些心事需要说很多遍，才会慢慢变轻。你可以重复，也可以停下来。此刻你最需要什么呢？';
  const options=fish?['我在听。不用一次讲清楚，也不用担心说得零碎。这件事里，最让你在意的是什么呢？','有些心事像打了结的水草，慢慢说也许能看清一点。你想先聊感受，还是先聊发生的事？','嗯，今天这一页已经帮你收好了。如果给此刻的自己留一句话，你会想说什么？','先让心事在海水里漂一会儿。今天有没有一个很小的瞬间，让你感觉舒服了一点？']:['星星听见了。你不需要在这里表现得很坚强。说到这里的时候，你的心情有什么变化吗？','每个人的心里都有别人看不到的小宇宙。谢谢你打开一扇窗。还有哪一部分，是你想继续说的？','有些答案会慢慢出现，今天可以先不着急。明天的你，最希望收到一个怎样的小小提醒？','如果现在可以为自己做一件温柔的小事，你会选什么？哪怕只是喝口温水，也很好。'];
  return options[(n-1)%options.length];
}
$('#chat-form').addEventListener('submit',event=>{
  event.preventDefault();const text=$('#message-input').value.trim();if(!text){$('#message-input').focus();return;}
  if(!current){current={id:uid(),createdAt:new Date().toISOString(),mood,messages:[{role:'assistant',text:greetings[companion],companion}]};sessions.unshift(current);}
  const target=current;const who=companion;const msg={role:'user',text,companion:who};target.messages.push(msg);appendMessage($('#messages'),msg);$('#message-input').value='';save();
  const answer={role:'assistant',text:reply(text,who,target),companion:who};target.messages.push(answer);save();
  appendMessage($('#messages'),answer);$('#messages').scrollTop=$('#messages').scrollHeight;
});
$('#message-input').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();$('#chat-form').requestSubmit();}});
function navigate(page){
  if(!['home','diary'].includes(page))page='home';$$('main.page').forEach(el=>el.classList.toggle('hidden',el.id!==page));$$('.nav').forEach(el=>{el.classList.toggle('active',el.dataset.page===page);el.setAttribute('aria-current',el.dataset.page===page?'page':'false');});
  if(page==='diary')renderDiary();if(location.hash!==`#${page}`)location.hash=page;
}
$$('.nav').forEach(el=>el.addEventListener('click',()=>navigate(el.dataset.page)));window.addEventListener('hashchange',()=>navigate(location.hash.slice(1)));
function renderDiary(){
  const list=$('#diary-list');list.replaceChildren();const query=$('#search').value.trim().toLowerCase();
  const filtered=sessions.filter(e=>(dateText(e.createdAt)+' '+e.mood+' '+e.messages.map(m=>m.text).join(' ')).toLowerCase().includes(query));
  if(!filtered.length){const empty=document.createElement('div');empty.className='empty';const icon=document.createElement('span');icon.textContent='𓆝';const title=document.createElement('h3');title.textContent=query?'还没有找到这段心事':'故事的第一页，等你来写';const p=document.createElement('p');p.textContent=query?'试试其他词语，或者换一个日期。':'和小鱼或星星说说话，每一段对话都会自动成为一篇日记。';empty.append(icon,title,p);if(!query){const b=document.createElement('button');b.className='primary';b.textContent='去树洞坐一会儿 ↗';b.onclick=newChat;empty.append(b);}list.append(empty);return;}
  filtered.forEach(e=>{
    const button=document.createElement('button');button.className='diary-entry';const d=document.createElement('span');d.className='entry-date';d.textContent=dateText(e.createdAt);
    const title=document.createElement('h3');title.textContent=e.messages.find(m=>m.role==='user')?.text||'安静地坐一会儿';
    const p=document.createElement('p');p.textContent=e.messages.filter(m=>m.role==='assistant').at(-1)?.text||'';
    const meta=document.createElement('div');meta.className='entry-meta';const left=document.createElement('span');left.textContent=`${moodSymbols[e.mood]} ${e.mood} · ${e.messages.filter(m=>m.role==='user').length} 段心事`;const right=document.createElement('span');right.textContent='翻开这一页 ↗';meta.append(left,right);button.append(d,title,p,meta);button.onclick=()=>openEntry(e.id);list.append(button);
  });
}
$('#search').addEventListener('input',renderDiary);
function openEntry(id){openedEntry=id;const e=sessions.find(s=>s.id===id);if(!e)return;const content=$('#entry-content');content.replaceChildren();const date=document.createElement('span');date.className='entry-date';date.textContent=`${dateText(e.createdAt)} · ${moodSymbols[e.mood]} ${e.mood}`;const title=document.createElement('h2');title.textContent='那一天，和心事坐了一会儿';content.append(date,title);e.messages.forEach(m=>appendMessage(content,m));$('#delete-confirm').classList.add('hidden');$('#delete-entry').classList.remove('hidden');$('#entry-dialog').showModal();}
$('#delete-entry').onclick=()=>{$('#delete-confirm').classList.remove('hidden');$('#delete-entry').classList.add('hidden');};
$('#cancel-delete').onclick=()=>{$('#delete-confirm').classList.add('hidden');$('#delete-entry').classList.remove('hidden');};
$('#confirm-delete').onclick=()=>{sessions=sessions.filter(e=>e.id!==openedEntry);if(current?.id===openedEntry){current=null;renderChat();}save();$('#entry-dialog').close();renderDiary();toast('这篇日记已删除。');};
$('#export').onclick=()=>{const payload={version:1,exportedAt:new Date().toISOString(),entries:sessions};const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=`鱼星之间-心情日记-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('日记备份已准备好，请妥善保管。');};
$('#import').onclick=()=>$('#import-file').click();
$('#import-file').onchange=async event=>{const file=event.target.files[0];if(!file)return;try{if(file.size>5*1024*1024)throw Error('请选择小于 5MB 的日记文件');const data=JSON.parse(await file.text());if(data.version!==1)throw Error('不是受支持的日记备份');const entries=validateEntries(data.entries);let count=0;for(const entry of entries){if(!sessions.some(e=>e.id===entry.id)){sessions.push(entry);count++;}}sessions.sort((a,b)=>Date.parse(b.createdAt)-Date.parse(a.createdAt));save();renderDiary();toast(`已导入 ${count} 篇日记，重复的日记已跳过。`);}catch(error){toast(error instanceof SyntaxError?'文件无法读取，请选择导出的 JSON 备份。':error.message);}finally{event.target.value='';}};
function birthday(){$('#birthday-dialog').showModal();}$('#gift').onclick=birthday;$('#birthday-footer').onclick=birthday;
$$('[data-close]').forEach(el=>el.onclick=()=>el.closest('dialog').close());$$('dialog').forEach(el=>el.addEventListener('click',e=>{if(e.target===el){const r=el.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)el.close();}}));
$('#name-input').value=typeof prefs.name==='string'?prefs.name:'';$('#birthday-name').textContent=prefs.name||'亲爱的你';$('#name-input').addEventListener('input',e=>{prefs.name=e.target.value.trim();$('#birthday-name').textContent=prefs.name||'亲爱的你';savePrefs();});
for(const [id,who] of [['#scene-fish','fish'],['#scene-star','star']]){const activate=()=>{selectCompanion(who);$('#message-input').focus();};$(id).addEventListener('click',activate);$(id).addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();activate();}});}
// Ambient particles remain entirely local, with bounded counts and reduced-motion support.
const canvas=$('#particles'),ctx=canvas.getContext('2d'),reduceMotion=matchMedia('(prefers-reduced-motion: reduce)');
let width=innerWidth,height=innerHeight,particles=[],bursts=[],pointer={x:-1000,y:-1000},frame=0,enabled=prefs.particles!==false&&!reduceMotion.matches;
function resize(){width=innerWidth;height=innerHeight;const ratio=Math.min(devicePixelRatio||1,2);canvas.width=width*ratio;canvas.height=height*ratio;canvas.style.width=`${width}px`;canvas.style.height=`${height}px`;ctx.setTransform(ratio,0,0,ratio,0,0);particles=Array.from({length:width<760?48:105},()=>({x:Math.random()*width,y:Math.random()*height,r:Math.random()*1.7+.5,vx:(Math.random()-.5)*.25,vy:-Math.random()*.25-.08,phase:Math.random()*Math.PI*2,gold:Math.random()>.45}));}
function burst(x,y,count=30){if(!enabled)return;for(let i=0;i<count;i++){const a=Math.random()*Math.PI*2,s=Math.random()*2.5+.5;bursts.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:1,r:Math.random()*2+1});}if(bursts.length>300)bursts.splice(0,bursts.length-300);}
function draw(){frame=0;ctx.clearRect(0,0,width,height);if(!enabled||document.hidden)return;const t=performance.now()/1300;
  particles.forEach(p=>{p.x+=p.vx;p.y+=p.vy;const dx=p.x-pointer.x,dy=p.y-pointer.y,d=Math.hypot(dx,dy);if(d<110&&d>0){p.x+=dx/d*.8;p.y+=dy/d*.8;}if(p.y<-10)p.y=height+10;if(p.x<-10)p.x=width+10;if(p.x>width+10)p.x=-10;
  ctx.fillStyle=p.gold?`rgba(210,177,91,${.2+(Math.sin(t+p.phase)+1)*.14})`:`rgba(113,163,190,${.15+(Math.sin(t+p.phase)+1)*.13})`;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill();});
  bursts=bursts.filter(p=>p.life>0);bursts.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.vy+=.015;p.life-=.014;ctx.fillStyle=`rgba(207,172,76,${Math.max(0,p.life)*.7})`;ctx.beginPath();ctx.moveTo(p.x,p.y-p.r*2);ctx.lineTo(p.x+p.r*.5,p.y);ctx.lineTo(p.x,p.y+p.r*2);ctx.lineTo(p.x-p.r*.5,p.y);ctx.closePath();ctx.fill();});frame=requestAnimationFrame(draw);
}
function startParticles(){if(frame)cancelAnimationFrame(frame);frame=0;$('#particle-toggle').textContent=enabled?'✧ 星尘已开启':'✧ 星尘已暂停';$('#particle-toggle').setAttribute('aria-pressed',String(enabled));draw();}
$('#particle-toggle').onclick=()=>{enabled=!enabled;prefs.particles=enabled;savePrefs();startParticles();};
window.addEventListener('resize',resize);window.addEventListener('pointermove',e=>{pointer={x:e.clientX,y:e.clientY};},{passive:true});window.addEventListener('pointerout',e=>{if(!e.relatedTarget)pointer={x:-1000,y:-1000};});window.addEventListener('pointerdown',e=>burst(e.clientX,e.clientY),{passive:true});document.addEventListener('visibilitychange',startParticles);reduceMotion.addEventListener('change',()=>{enabled=!reduceMotion.matches&&prefs.particles!==false;startParticles();});
$('#make-wish').onclick=()=>{$('#birthday-dialog').close();toast('愿你心里那颗小小的愿望，慢慢开花。生日快乐！');for(let i=0;i<5;i++)setTimeout(()=>burst(width*(.2+Math.random()*.6),height*(.2+Math.random()*.5),48),i*170);};
resize();startParticles();selectCompanion('fish');setMood('平静');updateCount();navigate(location.hash.slice(1)||'home');

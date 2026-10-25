"use strict";
const STORAGE_KEY="miControlFinanciero_v2";
const CATEGORIES={
 income:["Sueldo","Trabajo independiente","Otros ingresos"],
 expense:["Alimentación","Transporte","Bancos","Servicios","Vivienda","Tarjetas de crédito","Salud","Entretenimiento","Educación","Compras personales","Otros"]
};
const CATEGORY_META={
 "Alimentación":["🍴","yellow"],"Transporte":["🚌","blue"],"Bancos":["🏦","purple-bg"],"Servicios":["💡","yellow"],
 "Vivienda":["🏠","blue"],"Tarjetas de crédito":["💳","purple-bg"],"Salud":["✚","green"],"Entretenimiento":["🎟","purple-bg"],
 "Educación":["📚","blue"],"Compras personales":["🛍","expense"],"Otros":["•••","purple-bg"],
 "Sueldo":["💰","green"],"Trabajo independiente":["💼","blue"],"Otros ingresos":["💵","green"]
};
const DEFAULT_BUDGETS={"Alimentación":600000,"Transporte":200000,"Bancos":400000,"Servicios":300000,"Vivienda":0,"Tarjetas de crédito":0,"Salud":0,"Entretenimiento":0,"Educación":0,"Compras personales":0,"Otros":300000};
const $=id=>document.getElementById(id);
function emptyData(){return {version:2,movements:[],debts:[],budgets:{...DEFAULT_BUDGETS}}}
function loadData(){try{const raw=localStorage.getItem(STORAGE_KEY)||localStorage.getItem("miControlFinanciero_v1");if(!raw)return emptyData();const p=JSON.parse(raw);return {version:2,movements:Array.isArray(p.movements)?p.movements:[],debts:Array.isArray(p.debts)?p.debts:[],budgets:{...DEFAULT_BUDGETS,...(p.budgets||{})}}}catch(e){console.error(e);return emptyData()}}
let data=loadData();
function saveData(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(data));return true}catch(e){alert("No se pudieron guardar los datos. Exporta un respaldo.");return false}}
const money=n=>new Intl.NumberFormat("es-CO",{style:"currency",currency:"COP",maximumFractionDigits:0}).format(Number(n)||0);
function localDateString(d=new Date()){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`}
function dateObj(s){const [y,m,d]=s.split("-").map(Number);return new Date(y,m-1,d)}
function formatDate(s){return dateObj(s).toLocaleDateString("es-CO",{day:"2-digit",month:"short"})}
function getPeriod(date=new Date()){const start=new Date(date.getFullYear(),date.getMonth(),17);if(date.getDate()<17)start.setMonth(start.getMonth()-1);const end=new Date(start.getFullYear(),start.getMonth()+1,16);return {start:localDateString(start),end:localDateString(end)}}
function currentMovements(){const p=getPeriod();return data.movements.filter(m=>m.date>=p.start&&m.date<=p.end)}
function totalByType(ms,type){return ms.filter(m=>m.type===type).reduce((s,m)=>s+m.amount,0)}
function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function msg(id,text){$(id).textContent=text}
function catOptions(){const type=$("movementType").value; $("movementCategory").innerHTML=CATEGORIES[type].map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join("")}
function budgetTotal(){return Object.values(data.budgets).reduce((s,v)=>s+(Number(v)||0),0)}
function expenseByCategory(c,ms=currentMovements()){return ms.filter(m=>m.type==="expense"&&m.category===c).reduce((s,m)=>s+m.amount,0)}
function renderSummary(){
 const p=getPeriod(),ms=currentMovements(),income=totalByType(ms,"income"),expense=totalByType(ms,"expense"),balance=income-expense;
 $("periodLabel").textContent=`${formatDate(p.start)} – ${dateObj(p.end).toLocaleDateString("es-CO",{day:"2-digit",month:"short"})}`;
 $("incomeTotal").textContent=money(income);$("expenseTotal").textContent=money(expense);$("balance").textContent=money(balance);
 $("debtPaymentsTotal").textContent=money(ms.filter(m=>m.debtPayment).reduce((s,m)=>s+m.amount,0));
 const total=budgetTotal(),spent=ms.filter(m=>m.type==="expense").reduce((s,m)=>s+m.amount,0),pct=total?Math.round(spent/total*100):0;
 $("budgetPercent").textContent=`${pct}%`;$("budgetDonut").style.setProperty("--progress",`${Math.min(pct,100)*3.6}deg`);
 $("budgetDonut").style.background=`conic-gradient(#18b969 0deg ${Math.min(pct,100)*3.6}deg,#c4e1fb ${Math.min(pct,100)*3.6}deg 360deg)`;
}
function budgetHTML(){
 const ms=currentMovements();
 return Object.keys(data.budgets).map(c=>{
  const spent=expenseByCategory(c,ms),limit=Number(data.budgets[c])||0,pct=limit?Math.round(spent/limit*100):0,meta=CATEGORY_META[c]||["•","purple-bg"];
  return `<div class="budget-row"><div class="budget-line"><span><span class="category-emoji">${meta[0]}</span> ${esc(c)}</span><strong>${money(spent)} / ${money(limit)}</strong></div><div class="track"><div class="track-fill ${pct>100?"over":""}" style="width:${Math.min(pct,100)}%"></div></div><div class="budget-subtitle">${limit?`${pct}% utilizado · ${spent>limit?"Excedido por "+money(spent-limit):"Disponible "+money(limit-spent)}`:"Sin límite establecido"}</div></div>`;
 }).join("");
}
function renderBudget(){
 $("budgetOverview").innerHTML=budgetHTML();
 $("budgetDetails").innerHTML=budgetHTML();
 $("budgetPeriodLabel").textContent=`${formatDate(getPeriod().start)} – ${dateObj(getPeriod().end).toLocaleDateString("es-CO",{day:"2-digit",month:"short"})}`;
 $("budgetTotal").textContent=money(budgetTotal());
 $("budgetFields").innerHTML=Object.keys(data.budgets).map((c,i)=>`<label for="budget-${i}">${esc(c)}</label><input id="budget-${i}" type="number" min="0" step="1" value="${Number(data.budgets[c])||0}" required>`).join("");
}
function movementHTML(m,del=true){
 const isIn=m.type==="income",meta=CATEGORY_META[m.category]||["•","purple-bg"];
 return `<div class="movement-row"><div class="row-left"><span class="row-icon ${isIn?"":meta[1]}">${meta[0]}</span><div><div class="row-title">${esc(m.description||m.category)}</div><div class="row-subtitle">${esc(m.category)} · ${formatDate(m.date)}</div>${del?`<div class="row-actions"><button class="small-action" data-delete-movement="${esc(m.id)}">Eliminar</button></div>`:""}</div></div><div class="amount ${isIn?"positive":"negative"}">${isIn?"+":"−"}${money(m.amount)}</div></div>`;
}
let movementFilter="all";
function renderMovements(){
 const p=getPeriod();$("historyPeriod").textContent=`${formatDate(p.start)} – ${dateObj(p.end).toLocaleDateString("es-CO",{day:"2-digit",month:"short"})}`;
 const search=($("movementSearch")?.value||"").toLowerCase();
 const ms=currentMovements().filter(m=>(movementFilter==="all"||m.type===movementFilter)&&`${m.description} ${m.category}`.toLowerCase().includes(search)).sort((a,b)=>b.date.localeCompare(a.date));
 $("movementHistory").innerHTML=ms.length?ms.map(m=>movementHTML(m)).join(""):`<div class="empty-state">No hay movimientos en este ciclo.</div>`;
}
function renderDebts(){
 $("debtTotal").textContent=money(data.debts.reduce((s,d)=>s+d.balance,0));
 $("debtList").innerHTML=data.debts.length?data.debts.map(d=>`<div class="debt-row"><div class="row-left"><span class="row-icon purple-bg">💳</span><div><div class="row-title">${esc(d.name)}</div><div class="row-subtitle">Cuota: ${money(d.payment)}${d.dueDay?` · Vence: día ${d.dueDay}`:""}</div><div class="row-actions"><button class="small-action" data-pay-debt="${esc(d.id)}">Registrar pago</button><button class="small-action" data-delete-debt="${esc(d.id)}">Eliminar</button></div></div></div><div class="amount">${money(d.balance)}</div></div>`).join(""):`<div class="empty-state">No tienes deudas registradas.</div>`;
}
function renderReports(){
 const ms=currentMovements(),inc=totalByType(ms,"income"),exp=totalByType(ms,"expense"),debt=ms.filter(m=>m.debtPayment).reduce((s,m)=>s+m.amount,0),total=budgetTotal(),used=total?Math.round(exp/total*100):0,max=Math.max(inc,exp,debt,1),p=getPeriod();
 $("reportPeriod").textContent=`${formatDate(p.start)} – ${dateObj(p.end).toLocaleDateString("es-CO",{day:"2-digit",month:"short"})}`;
 $("reportIncome").textContent=money(inc);$("reportExpenses").textContent=money(exp);$("reportDebtPayments").textContent=money(debt);
 $("reportIncomeBar").style.width=`${inc/max*100}%`;$("reportExpenseBar").style.width=`${exp/max*100}%`;$("reportDebtBar").style.width=`${debt/max*100}%`;
 $("reportBalance").textContent=money(inc-exp);$("reportBudgetRate").textContent=`${used}%`;
 $("categoryReport").innerHTML=Object.keys(data.budgets).map(c=>({c,v:expenseByCategory(c,ms)})).filter(x=>x.v>0).sort((a,b)=>b.v-a.v).map(x=>`<div class="budget-row"><div class="budget-line"><span>${esc(x.c)}</span><strong>${money(x.v)}</strong></div><div class="track"><div class="track-fill" style="width:${Math.min(100,x.v/Math.max(exp,1)*100)}%"></div></div></div>`).join("")||`<div class="empty-state">Registra gastos para ver el informe.</div>`;
}
function renderAll(){renderSummary();renderBudget();renderMovements();renderDebts();renderReports()}
function addMovement({type,amount,category,date,description,debtPayment=false}){
 if(!["income","expense"].includes(type)||!Number.isSafeInteger(amount)||amount<=0||!CATEGORIES[type].includes(category)||!/^\d{4}-\d{2}-\d{2}$/.test(date))throw Error("Revisa tipo, valor, categoría y fecha.");
 const m={id:crypto.randomUUID(),type,amount,category,date,description:String(description||"").trim().slice(0,100),debtPayment};
 data.movements.push(m);if(!saveData()){data.movements.pop();return false}return true;
}
function switchTab(name){
 document.querySelectorAll(".view").forEach(v=>v.classList.toggle("hidden",v.id!==name));
 document.querySelectorAll(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.tab===name));
 $("floatingAdd").classList.toggle("hidden",name==="settings");
 if(name==="movements")$("movementForm").scrollIntoView({behavior:"smooth",block:"start"});
 else window.scrollTo({top:0,behavior:"smooth"});
}
function showMovementForm(type){
 switchTab("movements");$("movementType").value=type;catOptions();$("movementDate").value=localDateString();
 $("movementFormTitle").textContent=type==="income"?"Nuevo ingreso":"Nuevo egreso";
 setTimeout(()=>$("movementAmount").focus({preventScroll:true}),150);
}
$("movementType").addEventListener("change",catOptions);
$("movementForm").addEventListener("submit",e=>{
 e.preventDefault();const amount=Number($("movementAmount").value),date=$("movementDate").value;
 try{if(date>localDateString())throw Error("La fecha no puede estar en el futuro.");
 if(addMovement({type:$("movementType").value,amount,category:$("movementCategory").value,date,description:$("movementDescription").value})){
 $("movementAmount").value="";$("movementDescription").value="";$("movementDate").value=localDateString();msg("movementMessage","Movimiento guardado correctamente.");renderAll();
 }}catch(err){msg("movementMessage",err.message)}
});
$("budgetForm").addEventListener("submit",e=>{
 e.preventDefault();const previous={...data.budgets};
 try{Object.keys(data.budgets).forEach((c,i)=>{const n=Number($("budget-"+i).value);if(!Number.isSafeInteger(n)||n<0)throw Error("Introduce valores enteros iguales o mayores que cero.");data.budgets[c]=n});
 if(!saveData()){data.budgets=previous;return}msg("budgetMessage","Presupuesto guardado.");renderAll();
 }catch(err){data.budgets=previous;msg("budgetMessage",err.message)}
});
$("editBudgetBtn").addEventListener("click",()=>$("budgetForm").scrollIntoView({behavior:"smooth"}));
$("debtForm").addEventListener("submit",e=>{
 e.preventDefault();const name=$("debtName").value.trim(),balance=Number($("debtBalance").value),payment=Number($("debtPayment").value),raw=$("debtDueDate").value,dueDay=raw?Number(raw):null;
 if(!name||!Number.isSafeInteger(balance)||balance<=0||!Number.isSafeInteger(payment)||payment<0||(dueDay!==null&&(dueDay<1||dueDay>31))){msg("debtMessage","Revisa los datos de la deuda.");return}
 const d={id:crypto.randomUUID(),name,balance,payment,dueDay};data.debts.push(d);if(!saveData()){data.debts.pop();return}
 $("debtForm").reset();$("debtPayment").value="0";msg("debtMessage","Deuda guardada.");renderAll();
});
document.addEventListener("click",e=>{
 const b=e.target.closest("button");if(!b)return;
 if(b.dataset.tab)switchTab(b.dataset.tab);
 if(b.dataset.go)switchTab(b.dataset.go);
 if(b.dataset.quick==="income")showMovementForm("income");
 if(b.dataset.quick==="expense")showMovementForm("expense");
 if(b.dataset.deleteMovement){const id=b.dataset.deleteMovement;if(confirm("¿Eliminar este movimiento?")){const old=data.movements;data.movements=old.filter(m=>m.id!==id);if(!saveData())data.movements=old;renderAll()}}
 if(b.dataset.deleteDebt){const old=data.debts;data.debts=old.filter(d=>d.id!==b.dataset.deleteDebt);if(!saveData())data.debts=old;renderAll()}
 if(b.dataset.payDebt){
  const d=data.debts.find(x=>x.id===b.dataset.payDebt);if(!d)return;
  const amt=Number(prompt(`Pago para ${d.name}. Saldo ${money(d.balance)}. Introduce valor COP:`,String(Math.min(d.payment||d.balance,d.balance))));
  if(!Number.isSafeInteger(amt)||amt<=0||amt>d.balance){if(!Number.isNaN(amt))alert("Valor de pago no válido.");return}
  const oldBalance=d.balance;d.balance-=amt;
  const cat=CATEGORIES.expense.includes("Bancos")?"Bancos":"Otros";
  if(!addMovement({type:"expense",amount:amt,category:cat,date:localDateString(),description:`Pago deuda: ${d.name}`,debtPayment:true})){d.balance=oldBalance;return}
  if(!saveData()){data.movements.pop();d.balance=oldBalance;saveData();return}renderAll();
 }
 if(b.dataset.filter){movementFilter=b.dataset.filter;document.querySelectorAll(".filter-pill").forEach(x=>x.classList.toggle("selected",x===b));renderMovements()}
});
$("floatingAdd").addEventListener("click",()=>showMovementForm("expense"));
$("newDebtBtn").addEventListener("click",()=>$("debtForm").scrollIntoView({behavior:"smooth"}));
$("searchToggle").addEventListener("click",()=>$("movementSearchWrap").classList.toggle("hidden"));
$("movementSearch").addEventListener("input",renderMovements);
$("settingsBtn").addEventListener("click",()=>switchTab("settings"));
$("notificationsBtn").addEventListener("click",()=>alert("No tienes avisos pendientes."));
function downloadFile(name,content,type){const url=URL.createObjectURL(new Blob([content],{type}));const a=document.createElement("a");a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
$("exportBtn").addEventListener("click",()=>{downloadFile(`respaldo-financiero-${localDateString()}.json`,JSON.stringify({...data,exportedAt:new Date().toISOString()},null,2),"application/json");msg("backupMessage","Respaldo JSON generado.")});
$("exportCsvBtn").addEventListener("click",()=>{const q=v=>`"${String(v??"").replace(/"/g,'""')}"`;const rows=[["Fecha","Tipo","Categoría","Descripción","Valor COP"],...data.movements.map(m=>[m.date,m.type==="income"?"Ingreso":"Egreso",m.category,m.description,m.amount])];downloadFile(`movimientos-${localDateString()}.csv`,"\uFEFF"+rows.map(r=>r.map(q).join(";")).join("\r\n"),"text/csv;charset=utf-8");msg("backupMessage","CSV generado.")});
$("importBtn").addEventListener("click",()=>$("importFile").click());
$("importFile").addEventListener("change",async e=>{const f=e.target.files[0];if(!f)return;try{const p=JSON.parse(await f.text());if(!p||!Array.isArray(p.movements)||!Array.isArray(p.debts)||!p.budgets)throw Error("Formato no válido");if(!confirm("Esto reemplazará los datos actuales. ¿Continuar?"))return;const old=data;data={version:2,movements:p.movements,debts:p.debts,budgets:{...DEFAULT_BUDGETS,...p.budgets}};if(!saveData()){data=old;return}renderAll();msg("backupMessage","Respaldo restaurado.")}catch(err){msg("backupMessage","No se pudo restaurar: "+err.message)}finally{e.target.value=""}});
$("movementDate").value=localDateString();catOptions();renderAll();

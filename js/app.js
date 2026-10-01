import {
  auth, db, signInWithEmailAndPassword, onAuthStateChanged, signOut,
  doc, getDoc, getDocs, query, where, orderBy,
} from "./firebase-init.js";
import { EMPRESAS, estado, ehAdmin, rotuloPapel, colEmpresa, dataCorte, $, esc } from "./estado.js";
import { CST_ENTRADA } from "./regras.js";
import { iniciarConferencia, renderConferencia } from "./conferencia.js";
import { iniciarArquivados, renderArquivados } from "./arquivados.js";
import { iniciarDashboard, renderDashboard } from "./dashboard.js";
import { iniciarUsuarios, renderUsuarios } from "./usuarios.js";
import { iniciarAnalista, renderAnalista } from "./analista.js";
import { iniciarLogs, renderLogs } from "./logs.js";

// Meses de histórico carregados automaticamente ao entrar na empresa. Período mais antigo
// que isso só é buscado do banco quando a pessoa pede (ver "Buscar mês antigo" em Arquivados),
// para não estourar a cota gratuita de leituras do Firestore conforme a base cresce.
const MESES_HISTORICO_AUTOMATICO = 3;

const VISOES = ["login-view", "sem-acesso-view", "empresa-view", "shell"];
const mostrar = (id) => VISOES.forEach((v) => $(v).classList.toggle("oculto", v !== id));

$("lista-cst").innerHTML = CST_ENTRADA.map((c) => `<option value="${c}">`).join("");
iniciarConferencia();
iniciarArquivados();
iniciarDashboard();
iniciarUsuarios();
iniciarAnalista();
iniciarLogs();

// ---------- login ----------
$("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  $("login-erro").textContent = "";
  try {
    await signInWithEmailAndPassword(auth, $("login-email").value, $("login-senha").value);
  } catch (err) {
    $("login-erro").textContent = "Não foi possível entrar: e-mail ou senha incorretos.";
  }
});
document.querySelectorAll("[data-sair]").forEach((b) => b.addEventListener("click", () => { if (podeSairDaConferencia()) signOut(auth); }));

const empresasPermitidas = () => ehAdmin()
  ? EMPRESAS
  : EMPRESAS.filter((e) => (estado.perfil.empresas || []).includes(e.id));

onAuthStateChanged(auth, async (user) => {
  estado.usuario = user;
  estado.perfil = null;
  estado.empresa = null;
  if (!user) return mostrar("login-view");

  let perfil = null;
  try {
    const snap = await getDoc(doc(db, "usuarios", user.uid));
    if (snap.exists()) perfil = snap.data();
  } catch (err) {
    console.error(err);
  }
  if (!perfil || perfil.ativo !== true) return semAcesso(user, "Seu acesso ainda não foi liberado (ou foi desativado).");

  estado.perfil = perfil;
  const nome = perfil.nome || user.email;
  $("usuario-nome").textContent = nome;
  $("usuario-papel").textContent = rotuloPapel(perfil.papel);
  $("avatar").textContent = nome.trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
  $("menu-config").classList.toggle("oculto", !ehAdmin());
  $("menu-logs").classList.toggle("oculto", !ehAdmin());

  const permitidas = empresasPermitidas();
  if (!permitidas.length) return semAcesso(user, "Seu usuário não tem nenhuma empresa liberada.");
  if (permitidas.length === 1) return entrarNaEmpresa(permitidas[0]);
  escolherEmpresa(permitidas);
});

function semAcesso(user, mensagem) {
  $("sem-acesso-msg").textContent = mensagem;
  $("sem-acesso-email").textContent = user.email;
  $("sem-acesso-uid").textContent = user.uid;
  mostrar("sem-acesso-view");
}

// ---------- empresa ----------
function escolherEmpresa(permitidas) {
  const ultima = localStorage.getItem("ultimaEmpresa");
  $("empresa-cards").innerHTML = permitidas.map((e) => `
    <button class="cartao-empresa ${e.id === ultima ? "ultima" : ""}" data-id="${esc(e.id)}">
      <b>${esc(e.nome)}</b><span>${esc(e.ramo)}</span>
    </button>`).join("");
  mostrar("empresa-view");
}
$("empresa-cards").addEventListener("click", (e) => {
  const b = e.target.closest("button[data-id]");
  if (b) entrarNaEmpresa(EMPRESAS.find((x) => x.id === b.dataset.id));
});
$("btn-trocar-empresa").addEventListener("click", () => { if (podeSairDaConferencia()) escolherEmpresa(empresasPermitidas()); });

async function entrarNaEmpresa(emp) {
  estado.empresa = emp;
  estado.notas = [];
  estado.sessao.clear();
  estado.competenciasCarregadas = new Set();
  $("busca-global").value = "";
  try { localStorage.setItem("ultimaEmpresa", emp.id); } catch (_) { /* ignora */ }
  $("marca-empresa").textContent = emp.nome;
  $("banner-empresa").textContent = emp.nome;
  $("btn-trocar-empresa").classList.toggle("oculto", empresasPermitidas().length < 2);
  mostrar("shell");
  irPara("conferencia");
  try {
    // Carrega só os últimos meses por padrão (evita ler a coleção inteira a cada login/troca
    // de empresa, o que cresceria sem parar e pode estourar a cota gratuita do Firestore).
    // Um mês mais antigo é buscado sob demanda em Arquivados ("Buscar mês antigo").
    const corte = dataCorte(MESES_HISTORICO_AUTOMATICO);
    const snap = await getDocs(query(colEmpresa("notas"), where("dataEmissao", ">=", corte), orderBy("dataEmissao", "desc")));
    estado.notas = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    alert("Não foi possível carregar as notas: " + err.message);
  }
  renderTelaAtual();
}

// ---------- navegação ----------
let telaAtual = "conferencia";
const RENDERS = { conferencia: renderConferencia, arquivados: renderArquivados, dashboard: renderDashboard, analista: renderAnalista, configuracoes: renderUsuarios, logs: renderLogs };

function renderTelaAtual(zerar = false) { RENDERS[telaAtual](zerar); }

// Se está na Conferência e há notas desta sessão ainda não revisadas, confirma antes de sair
// (elas continuam salvas no banco, mas ficam pendentes até alguém revisar).
function podeSairDaConferencia() {
  if (telaAtual !== "conferencia") return true;
  const pendentes = estado.notas.filter((n) => estado.sessao.has(n.id) && n.status !== "revisada").length;
  if (!pendentes) return true;
  return confirm(`Há ${pendentes} nota(s) importada(s) nesta sessão ainda não revisada(s). Elas continuam salvas, mas ficam pendentes até você revisar. Sair mesmo assim?`);
}

function irPara(tela) {
  if (tela !== telaAtual && !podeSairDaConferencia()) return;
  telaAtual = tela;
  document.querySelectorAll(".tela").forEach((s) => s.classList.toggle("oculto", s.id !== "tela-" + tela));
  document.querySelectorAll("nav button[data-tela]").forEach((b) => b.classList.toggle("ativo", b.dataset.tela === tela));
  renderTelaAtual(true);
}
document.querySelectorAll("nav button[data-tela]").forEach((b) => b.addEventListener("click", () => irPara(b.dataset.tela)));

$("busca-global").addEventListener("input", () => {
  if (telaAtual === "conferencia" || telaAtual === "arquivados") renderTelaAtual(true);
});

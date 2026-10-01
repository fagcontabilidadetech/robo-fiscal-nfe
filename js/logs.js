// logs.js — Logs de exclusão (só administrador).
// Registra só quem excluiu um XML/nota (não outras ações), para não acumular log demais.
import { getDocs, query, orderBy, limit } from "./firebase-init.js";
import { colEmpresa, $, esc } from "./estado.js";

const LIMITE = 300;

const formatarQuando = (ts) => (ts?.toDate ? ts.toDate().toLocaleString("pt-BR") : "—");

export function iniciarLogs() {
  // nada para conectar aqui — a lista é buscada do banco toda vez que a tela é aberta (renderLogs)
}

export async function renderLogs() {
  const alvo = $("logs-tabela");
  alvo.innerHTML = '<p class="vazio">Carregando...</p>';
  try {
    const snap = await getDocs(query(colEmpresa("logs"), orderBy("quando", "desc"), limit(LIMITE)));
    const logs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    alvo.innerHTML = logs.length
      ? `<table>
          <thead><tr><th>Quando</th><th>Quem excluiu</th><th>NF</th><th>Fornecedor</th></tr></thead>
          <tbody>${logs.map((l) => `<tr>
            <td>${esc(formatarQuando(l.quando))}</td>
            <td>${esc(l.usuarioNome || l.usuarioEmail || "—")}</td>
            <td>${esc(l.numero || "—")}</td>
            <td>${esc(l.emitenteNome || "—")}</td>
          </tr>`).join("")}</tbody>
        </table>`
      : '<p class="vazio">Nenhuma exclusão registrada ainda nesta empresa.</p>';
  } catch (err) {
    alvo.innerHTML = `<p class="vazio">Não foi possível carregar os logs: ${esc(err.message)}</p>`;
  }
}

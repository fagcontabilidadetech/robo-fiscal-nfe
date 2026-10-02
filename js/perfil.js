// perfil.js — autoatendimento: a própria pessoa troca a sua senha.
// Como as contas usam e-mails inventados (não recebem o link de "esqueci minha senha"),
// quem já está logado troca a senha direto aqui, sem precisar de e-mail nenhum.
import { auth, updatePassword } from "./firebase-init.js";
import { $ } from "./estado.js";

export function iniciarPerfil() {
  $("btn-minha-senha").addEventListener("click", () => {
    $("senha-nova").value = "";
    $("senha-confirmar").value = "";
    $("senha-erro").textContent = "";
    $("senha-sucesso").textContent = "";
    $("dlg-senha").showModal();
  });
  $("senha-cancelar").addEventListener("click", () => $("dlg-senha").close());

  $("form-senha").addEventListener("submit", async (e) => {
    e.preventDefault();
    const erro = $("senha-erro");
    const sucesso = $("senha-sucesso");
    erro.textContent = "";
    sucesso.textContent = "";
    const nova = $("senha-nova").value;
    const confirmar = $("senha-confirmar").value;
    if (nova.length < 6) { erro.textContent = "A senha precisa ter ao menos 6 caracteres."; return; }
    if (nova !== confirmar) { erro.textContent = "As senhas não coincidem."; return; }

    const btn = $("senha-salvar");
    btn.disabled = true;
    try {
      await updatePassword(auth.currentUser, nova);
      sucesso.textContent = "Senha alterada com sucesso!";
      setTimeout(() => $("dlg-senha").close(), 1500);
    } catch (err) {
      if (err.code === "auth/requires-recent-login") {
        erro.textContent = "Por segurança, o Firebase exige um login recente para trocar a senha. Saia, entre de novo e tente outra vez em seguida.";
      } else {
        erro.textContent = "Não foi possível alterar: " + err.message;
      }
    } finally {
      btn.disabled = false;
    }
  });
}

# Alojamento NAVEL — notas CiberConceito (cPanel)

Informação **recebida por email** (suporte **CiberConceito**, contacto **Paulo Cardoso**), relevante para **SSH**, **SFTP** e **FTP** da conta **navel.pt**. Guardar como referência operacional; não contém credenciais.

**Última actualização:** 2026-04-18 (conteúdo do email analisado pelo projecto).

---

## SSH

| Item | Valor / nota |
|------|----------------|
| **Estado** | SSH **activo** na conta |
| **Porta** | **11022** (não usar a porta 22 por defeito) |

O **nome de utilizador SSH** é o da **conta principal** do cPanel (painel → *General Information* / *Informações da conta* — não é o email `deploy@navel.pt` da conta FTP). No projecto assumimos o user Linux típico `navel` alinhado a `/home/navel/public_html`; se o painel mostrar outro username, usa esse valor em `CPANEL_SFTP_USER`.

A **password SFTP/SSH** é normalmente a **mesma password com que entras no cPanel** (pode ser **diferente** da password da subconta FTP dedicada).

Para ligação manual (exemplo genérico; substituir `UTILIZADOR` pelo user indicado no cPanel):

```text
ssh -p 11022 UTILIZADOR@navel.pt
```

No **deploy automático** do `navel-site`, em `.env.cpanel` (ver `.env.cpanel.example`):

```env
CPANEL_PROTOCOL=sftp
CPANEL_REMOTE_ROOT=/home/SEU_USER/public_html
CPANEL_SFTP_HOST=navel.pt
CPANEL_SFTP_PORT=11022
CPANEL_SFTP_USER=SEU_USER
```

Se a password tiver caracteres como `=`, `!`, `&`, `%` ou **começar por `=`**, coloca-a **entre aspas duplas** na linha `CPANEL_SFTP_PASSWORD="..."` — o parser do `.env.cpanel` só trata isso correctamente com aspas.

O utilizador SFTP costuma ser o **utilizador principal da conta cPanel**, não a conta FTP dedicada de deploy — ver `docs/DEPLOY-AUTOMATICO-CPANEL.md`.

---

## FTP / FTPS — bloqueios e limites

O email indica que, **muitas vezes**, o problema **não** é firewall a bloquear o site (nesse caso o site ficaria inacessível).

Sugestão do fornecedor:

- O cliente pode estar a atingir **limites de ligações FTP** simultâneas, o que provoca **bloqueios temporários**.
- **Reduzir** no cliente FTP o número de **ligações em paralelo** para **2 ou 3**.

Isto aplica-se a clientes como FileZilla, WinSCP em modo FTP, ou ao pipeline `basic-ftp` se estiver configurado com muitas conexões paralelas (rever opções do script se existirem).

---

## Referência interna

- Deploy: **`docs/DEPLOY-AUTOMATICO-CPANEL.md`**
- Segredos consolidados (fora do Git): **`C:\Cursor_Projetos\NAVEL\.navel-secrets\navel-secrets.env`**
- Fornecedor: [CiberConceito](https://ciberconceito.com)

O script `cpanel-deploy.mjs` envia ficheiros **em sequência** sobre uma ligação SFTP/FTPS — não abre dezenas de ligações em paralelo (alinhado à recomendação de poucas ligações FTP).

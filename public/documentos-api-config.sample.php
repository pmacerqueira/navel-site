<?php
/**
 * Copiar para documentos-api-config.php no servidor (mesma pasta que documentos-api.php).
 * NÃO versionar documentos-api-config.php (contém segredos).
 *
 * Recomendado (Supabase actual): validar token chamando Auth /user.
 * - supabase_url + supabase_anon_key
 *
 * Compatibilidade antiga (HS256): jwt_secret opcional.
 */
declare(strict_types=1);

return [
    /** Ex: https://xxxx.supabase.co */
    'supabase_url' => 'https://SEU-PROJETO.supabase.co',
    /** Chave anon (Settings -> API Keys). */
    'supabase_anon_key' => 'COLE_AQUI_A_SUPABASE_ANON_KEY',

    /**
     * Opcional (fallback legado HS256): Legacy JWT Secret.
     * Se não usar, deixe string vazia.
     */
    'jwt_secret' => '',

    /** Email do administrador (mesmo que ADMIN_EMAIL no site) */
    'admin_email' => 'comercial@navel.pt',

    /**
     * Integração AT_Manut (taxonomia técnica).
     * Endpoint esperado: devolve JSON com `items` (ou array direto) contendo id/code/name/path/parentId.
     */
    'taxonomy_nodes_url' => '',
    /** Token Bearer opcional para o endpoint da taxonomia. */
    'taxonomy_auth_token' => '',

    /**
     * Pasta absoluta no servidor onde ficam os documentos (fora do docroot se possível).
     * Exemplo cPanel: /home/UTILIZADOR/private_navel/documentos
     * Por defeito (relativo): pasta documentos-store ao lado deste script (protegida por .htaccess).
     */
    'documentos_root' => __DIR__ . DIRECTORY_SEPARATOR . 'documentos-store',

    /**
     * ── Integração OneDrive (pasta-mãe "Comercial") ─────────────────────────
     * Partilhamos o registo Entra ID já existente no projecto navel-propostas.
     *
     * Passos (só uma vez, no portal Entra):
     *  1. Microsoft Entra admin center → App registrations → abrir a app do navel-propostas
     *  2. Authentication → Add platform "Web" → Redirect URI: https://navel.pt/onedrive-callback.php
     *  3. API permissions → Add: Microsoft Graph → Delegated → Files.ReadWrite.All
     *     e, se ainda não estiverem, offline_access, openid, profile, User.Read
     *  4. "Grant admin consent for NAVEL"
     *
     * Depois preencher os valores em baixo. O client_secret pode ser o mesmo usado no navel-propostas.
     */
    'microsoft_tenant_id'     => '',
    'microsoft_client_id'     => '',
    'microsoft_client_secret' => '',
    'microsoft_redirect_uri'  => 'https://navel.pt/onedrive-callback.php',

    /**
     * Caminho da pasta dentro do OneDrive ESPELHADA na pasta-mãe "Comercial".
     * O script tenta "Documentos/<path>" e "Documents/<path>" se não encontrar.
     * Ex.: "Documentos/NAVEL/CATALOGOS NAVEL".
     * Alias legacy mantido: 'onedrive_root_path' (continua a funcionar).
     */
    'onedrive_comercial_path' => 'Documentos/NAVEL/CATALOGOS NAVEL',

    /**
     * Caminho da pasta dentro do OneDrive destino da pasta-mãe "Assistência Técnica".
     * Se a pasta ainda não existir no OneDrive, é criada na primeira sincronização.
     * Ex.: "Documentos/NAVEL/ASSISTENCIA TECNICA".
     */
    'onedrive_at_path'        => 'Documentos/NAVEL/ASSISTENCIA TECNICA',

    /**
     * Direcção da sincronização por mount.
     *   'pull'          : OneDrive é fonte de verdade; deletes no portal bloqueados.
     *   'push'          : Sharepoint é fonte de verdade; deletes no portal propagam para OneDrive.
     *   'bidirectional' : Ambos os lados; política last-modified-wins (vence o mtime mais recente).
     *
     * Default = 'bidirectional'. Altera se preferires restringir um mount.
     */
    'onedrive_comercial_direction' => 'bidirectional',
    'onedrive_at_direction'        => 'bidirectional',

    /**
     * Token partilhado para o cron periódico (cPanel). Gere um valor aleatório.
     * Cron sugerido (cPanel → Cron Jobs):
     *   * /15 * * * * curl -s "https://navel.pt/onedrive-cron.php?token=COLOQUE_O_TOKEN" > /dev/null
     */
    'onedrive_cron_token'     => '',
];

/**
 * Condições Gerais de Venda e Serviço (CGVS) — texto conforme impresso IMP.01(01),
 * N.º Edição / Data: 01 / 30.03.2022 (documento interno ISO). Apenas aplicação web.
 */
export const cgvsMeta = {
  code: 'IMP.01(01)',
  edition: '01 / 30.03.2022',
}

/** @type {{ id: string, title?: string, paragraphs?: string[], subitems?: { label: string, text: string }[], paragraphsAfter?: string[] }[]} */
export const cgvsSections = [
  {
    id: '1',
    title: '1. CONDIÇÕES GERAIS',
    paragraphs: [
      '1.1. O fornecimento de equipamentos e a prestação de serviços (doravante designados de «Fornecimentos») pela José Gonçalves Cerqueira (NAVEL-AÇORES), Lda. (doravante designada NAVEL) é regulado pelas presentes Condições Gerais de Venda e Serviço (doravante designadas abreviadamente «CGVS»), salvo relativamente a quanto for expressamente acordado em contrário na proposta apresentada pela NAVEL ao Comprador (doravante designada abreviadamente a «Proposta») ou na aceitação, pela NAVEL, da encomenda colocada pelo Comprador.',
      '1.2. O Comprador teve conhecimento das presentes CGVS no âmbito das suas relações comerciais com a NAVEL e estas considerar-se-ão efectivamente conhecidas pelo Comprador, para todos os efeitos, quando colocar a Encomenda.',
    ],
  },
  {
    id: '2',
    title: '2. PROPRIEDADE INTELECTUAL E INDUSTRIAL',
    paragraphs: [
      'Os direitos de propriedade intelectual e/ou industrial sobre a Proposta, em todos os seus termos e a informação anexa à mesma, são detidos pela NAVEL ou pelos seus fornecedores. Consequentemente, o Comprador não pode reproduzir, parcial ou totalmente, tais elementos ou ceder a sua utilização a terceiros sem o consentimento prévio concedido por escrito pela NAVEL, e poderá apenas utilizá-los para efeitos da execução da Encomenda.',
    ],
  },
  {
    id: '3',
    title: '3. FORMALIZAÇÃO DA ORDEM DE ENCOMENDA E ÂMBITO DOS FORNECIMENTOS',
    paragraphs: [
      '3.1. O âmbito dos Fornecimentos deverá estar claramente especificado na Encomenda. Para que a mesma produza efeitos, deverá ser validada com a assinatura da Aceitação da Encomenda, onde o cliente declara aceitar, sem reservas, as Condições Gerais de Venda e outros termos da Proposta.',
      '3.2. Quaisquer modificações e/ou variações do âmbito dos Fornecimentos incluídos na Encomenda e/ou à Aceitação da Encomenda, propostas por uma das Partes, deverão ser propostos por escrito à outra parte e serão válidos e eficazes apenas quando expressamente aceites pela outra parte.',
      '3.3. Para o caso das reparações ao abrigo da Assistência Técnica relativa a máquinas e ferramentas, o Comprador deverá entregar o equipamento por meio de Guia de Transporte autenticada onde sejam indicados o nº da factura da compra, a completa identificação do produto e do seu nº de série, bem como uma descrição do problema detectado.',
      '3.4. Com a entrega o equipamento para reparação, só será entregue um Orçamento se este for expressamente pedido pelo cliente Comprador. Não o pedindo e assinando a Aceitação da Encomenda, o Comprador declara aceitar sem reservas todos os custos relativos com o necessário manuseamento do equipamento, da reparação efectuada e aceita na íntegra as CGVS que regem os fornecimentos da NAVEL.',
      '3.5. Caso seja solicitado um Orçamento de reparação do produto e seja necessário o seu reenvio para um Centro de Assistência Técnica do fabricante, os custos relativos ao seu transporte de ida e volta serão apurados e comunicados ao Comprador com a Aceitação da Encomenda. O equipamento só será enviado para a Assistência se o Comprador assinar a Aceitação da Encomenda que mencione estes custos de manuseamento e transporte, mesmo antes de tomar conhecimento do Orçamento final de reparação por parte da Assistência, que incluirá os componentes e a mão-de-obra necessários e os seus preços unitários. Nesta situação, o produto será transportado a expensas (justificadas por meio de factura do serviço contratado) e risco do cliente.',
      '3.6. Os Orçamentos solicitados, mas não aceites pelo Comprador, ficam sujeitos às seguintes condições e encargos:',
    ],
    subitems: [
      { label: 'a)', text: '15,00€ + IVA, caso os equipamentos sejam pretendidos de volta, em estado desmontado;' },
      { label: 'b)', text: '30,00€ + IVA, caso os equipamentos sejam pretendidos de volta, em estado montado;' },
    ],
    paragraphsAfter: [
      '3.7. Para além dos encargos acima explicitados, ficarão também a cargo do cliente os encargos previstos no ponto 3.5.',
    ],
  },
  {
    id: '4',
    title: '4. PREÇOS',
    paragraphs: [
      '4.1. Os preços dos Fornecimentos são os estabelecidos na Tabela de Venda ao Publico da NAVEL, salvo outra tabela especial dedicada ao cliente, e não incluem IVA ou quaisquer outros impostos ou taxas, que serão cobrados na factura às taxas legais em vigor. Salvo outra convenção estabelecida entre a NAVEL e o Comprador, os preços não incluem a embalagem, o transporte, as cargas e descargas, o seguro e consideram-se preços de bens entregues nos pontos de venda da NAVEL.',
      '4.2. Os preços indicados na Proposta são válidos por 30 dias e reportam-se às condições de pagamento aí estabelecidas. Se as mesmas forem alteradas, os preços indicados na Proposta serão revistos.',
      '4.3. Após a Aceitação, os preços são fixos e não sujeitos a revisão. No entanto, haverá lugar a revisão de preços quando tal revisão for expressamente acordada entre a NAVEL e o Comprador, ou o prazo de entrega e recepção dos Fornecimentos sofrer atrasos por razão directa ou indirectamente atribuível ao Comprador.',
    ],
  },
  {
    id: '5',
    title: '5. CONDIÇÕES DE FORNECIMENTO',
    paragraphs: [
      '5.1. As condições de fornecimento são as indicadas na Proposta e/ou na Encomenda e/ou na Aceitação da Encomenda.',
      '5.2. Os pagamentos deverão ser realizados a pronto, com a entrega nos balcões de venda ou, nas situações de conta corrente a crédito, a 30 dias da data da factura por crédito da conta bancária da NAVEL ou por outros meios acordados, sem quaisquer outras deduções. Para além destas, outras condições de pagamento terão de ser acordadas por escrito entre a NAVEL e o Comprador e tendo como base o histórico da relação comercial entre as partes, bem como eventual Aprovação de Crédito por Entidade independente.',
      '5.3. Caso se verifiquem atrasos nos pagamentos a efectuar pelo Comprador, este terá que pagar à NAVEL, sem qualquer formalidade adicional e desde a data de vencimento da respectiva factura, os juros de mora calculados a uma taxa de juro equivalente à taxa EURIBOR para depósitos de um mês, acrescida de 1 ponto percentual (1%), e a taxa referida será a publicada pela Federação de Bancos Europeus e a Associação de Mercados Financeiros no segundo dia útil após o início da contagem dos juros, sem exoneração da obrigação de pagamento das restantes quantias em falta, nos termos acordados.',
      '5.4. Se ocorrerem atrasos nos pagamentos devidos pelo Comprador à NAVEL, esta poderá suspender os Fornecimentos ou os serviços a eles associados, ou até interrompê-los definitivamente, sem prejuízo da obrigação do Comprador de pagar as facturas vencidas e, quando adequado, pagar à NAVEL uma compensação adicional pela suspensão ou interrupção definitiva dos Fornecimentos.',
      '5.5. Reserva de Propriedade: Todas as vendas a crédito são efectuadas com reserva de propriedade dos bens vendidos a favor da NAVEL, até pagamento integral do respectivo preço. Consequentemente, o direito de propriedade sobre os materiais fornecidos só será transmitido ao Comprador com o pagamento integral, não podendo o Comprador, até esse momento, ceder a utilização dos materiais, onerá-los, aliená-los ou deslocá-los, bem como dispor, por qualquer outra forma, dos mesmos, em qualquer dos casos, sem obter a prévia autorização da NAVEL para o efeito.',
    ],
  },
  {
    id: '6',
    title: '6. PRAZO DOS FORNECIMENTOS E CONDIÇÕES DE ENTREGA',
    paragraphs: [
      '6.1. O prazo dos fornecimentos é estabelecido e adoptado com a Aceitação da Encomenda de Cliente. A NAVEL deixará de estar obrigada ao cumprimento do prazo de entrega formalizado caso o Comprador esteja em incumprimento da sua obrigação de pagamento.',
      '6.2. O prazo de entrega será modificado caso:',
    ],
    subitems: [
      { label: 'a)', text: 'O Comprador não entregue atempadamente à NAVEL a documentação necessária para a execução dos fornecimentos ou requeira modificações ao seu pedido, que sejam aceites pela NAVEL e que, no seu entender, requeiram uma extensão do prazo de entrega;' },
      { label: 'b)', text: 'O Comprador tenha incumprido alguma das suas obrigações contratuais indicadas na ordem de encomenda aceite pela NAVEL, especialmente no que diz respeito à obrigação de pagamento;' },
      { label: 'c)', text: 'Ocorram eventos ou combinação de eventos imprevisíveis e/ou fora do controlo da NAVEL, que impeçam ou atrasem os fornecimentos agendados, incluindo, mas não limitados a: greves de fornecedores, transportes ou serviços, falha no fornecimento de terceiros, ou por motivos relacionados com qualquer causa de Força Maior, etc.' },
      { label: 'd)', text: 'Ocorram alterações não previstas aos tempos de prestações de serviços no âmbito da Assistência Técnica / Pós-Venda, decorrentes do próprio processo de reparação e aprovação por ensaio final. Nesta situação, a NAVEL compromete-se, no prazo de 3 dias após a detecção de tal necessidade, a comunicar ao cliente a alteração do prazo do fornecimento do serviço.' },
    ],
  },
  {
    id: '7',
    title: '7. EMBALAGEM E TRANSPORTE',
    paragraphs: [
      '7.1. Caso seja a Navel a ter a responsabilidade de contratação do meio de transporte, esta escolherá um meio registado que permita o seu seguimento por carta de porte. Todos os fornecimentos da Navel são considerados «Ex-works» (Incoterms 2000).',
      '7.2. Salvo convenção em contrário entre as Partes, as embalagens dos equipamentos e materiais poderão ser objecto de um preço especial a aplicar sobre o preço do respectivo produto fornecido, não sendo admissível a sua devolução. O Comprador, enquanto produtor de resíduos de embalagens não urbanas, é responsável pela sua valorização, nos termos do artigo 4.º n.º 7 do D-L n.º 366-A/97, de 20 de Dezembro., como alterado pelo D-L n.º 162/2000, de 27 de Julho., pelo D-L n.º 92/2006, de 25 de Maio e pelo D-L n.º 178/2006, de 5 de Setembro.',
      '7.3. Salvo convenção em contrário, o transporte, incluindo cargas e descargas, dos Fornecimentos, realizar-se-á sempre a expensas e risco do Comprador, pelo que a NAVEL não assumirá qualquer tipo de responsabilidade por danos ou prejuízos derivados de tal transporte causados aos Fornecimentos, sendo do Comprador a sua total responsabilidade.',
      '7.4. Se os produtos se encontrarem prontos para serem fornecidos e o Comprador não os levantar no prazo de 30 dias nem chegar a acordo com a NAVEL para que os mesmos sejam armazenados nas suas instalações, todos os custos com tal armazenagem ficarão a cargo do Comprador, por quem correrão também todos os riscos inerentes aos produtos durante o período de tal armazenagem. Findo este período a Navel também deixará de exercer qualquer responsabilidade sobre o produto.',
    ],
  },
  {
    id: '8',
    title: '8. TRABALHOS PREPARATÓRIOS, AUTORIZAÇÕES E LICENÇAS',
    paragraphs: [
      '8.1. O Comprador executará adequada e atempadamente e a expensas suas os trabalhos preparatórios necessários para à prestação dos Serviços nos termos e prazos acordados, nomeadamente acessos, ligação de fornecimento de água e electricidade, limpeza dos terrenos, fundações, sistemas de esgotos, trabalhos em geral, instalações prévias, etc. O Comprador deve também fornecer à NAVEL a documentação necessária (projectos, designs, planos, especificações) e o calendário apropriado para a execução dos trabalhos pelos quais é responsável, para que esta possa correctamente e sem quaisquer interferências, prestar os Serviços contratados.',
      '8.2. Se o Comprador assumir a responsabilidade de fornecer pessoal auxiliar (pedreiros, electricistas ou outros operários) necessários para alguns trabalhos relativos ou suplementares aos Serviços, tal pessoal deve ser devidamente qualificado. O Comprador é responsável pelo cumprimento de toda e qualquer obrigação legal, do foro laboral ou outros, que possa ser aplicável aos trabalhadores, nos termos da legislação actual, e pelo escrupuloso cumprimento de toda e qualquer regra de segurança e higiene no local de trabalho.',
      '8.3. O Comprador deve obter, a expensas e responsabilidade suas, todas as licenças e autorizações necessárias para a execução dos Serviços pela NAVEL nos termos legais.',
    ],
  },
  {
    id: '9',
    title: '9. DEVOLUÇÃO DE MATERIAIS E RECLAMAÇÕES',
    paragraphs: [
      '9.1. Em caso algum a NAVEL aceitará devolução de materiais sem que a mesma tenha sido acordada especificamente entre as Partes, salvo se se tratarem de bens comprovadamente defeituosos. Fixa-se o prazo de 5 dias a contar da data de recepção dos Fornecimentos para (i) o Comprador notificar a NAVEL da sua intenção de proceder a uma devolução, notificação esta que deve indicar também a justificação da intenção de devolver o equipamento em causa e (ii) o Comprador acordar com a NAVEL a forma da devolução. Qualquer reclamação deverá ser justificada, clara e apresentada à NAVEL por escrito.',
      '9.2. As devoluções de materiais às instalações da NAVEL, seja para sua devolução, substituição ou reparação deverão fazer-se sempre a expensas do Comprador e acompanhadas de uma Nota de Devolução em duplicado, no caso de o comprador ser um sujeito passivo de IVA.',
      '9.3. Se uma devolução for efectuada por erro na Encomenda ou outras razões não imputáveis à NAVEL, esta poderá cobrar ao Comprador 15% adicionais sobre o valor líquido do material devolvido a título de participação nos custos de revisão e acondicionamento.',
      '9.4. A NAVEL não aceita devoluções de materiais que tenham sido utilizados, montados noutros equipamentos ou instalações ou sujeitos a desmontagens estranhas à NAVEL ou cuja embalagem tenha sido violada, modificada ou não corresponda ao original. Não poderão também ser devolvidos quaisquer equipamentos desenhados ou fabricados exclusivamente para o Projecto do Cliente.',
    ],
  },
  {
    id: '12',
    title: '12. GARANTIAS',
    paragraphs: [
      '12.1. Salvo disposição expressa em contrário na proposta ou na Aceitação da Encomenda, ou outra convenção do fabricante, a NAVEL garante, de acordo com o Decreto-Lei 84/2008, os componentes, equipamentos e sistemas fornecidos quanto a defeitos de materiais durante 1 (um) ano a contar da data da recepção, seja esta expressa ou tácita (15 dias após a prestação dos Fornecimentos, sem que tenha havido lugar ao envio de qualquer comunicação escrita pelo Comprador à NAVEL relativamente a alguma não conformidade). De resto, aplicar-se-á as condições de garantia de compra para Uso Profissional (contrato de compra e venda entre um vendedor profissional e um comprador profissional) e, neste caso, o artigo 921º do Código Civil, o qual dispõe que no silêncio do contrato, o prazo de garantia expira seis meses após a entrega da coisa, se os usos não estabelecerem prazo maior.',
      '12.2. Sempre que ocorra, o comprador deverá notificar a NAVEL por escrito do conhecimento de qualquer defeito coberto pela presente garantia.',
      '12.3. A garantia estipulada no n.º 1 da presente cláusula consiste na reparação ou substituição dos elementos reconhecidos como defeituosos, independentemente de se tratar de defeitos de material, de fabrico ou de montagens, sem prejuízo de outros remédios que a lei conceda ao Comprador. As reparações serão realizadas em oficinas da NAVEL, sendo por conta do Comprador a desmontagem, empacotamento, carregamento, transporte, alfândega, impostos, taxas, etc., aplicáveis, decorrentes pelo envio do material defeituoso às oficinas da NAVEL e da sua devolução ao Comprador. Não obstante, as Partes poderão acordar que as reparações sejam realizadas nas instalações do Comprador, por pessoal técnico da NAVEL.',
      '12.4. As reparações ou substituições de elementos defeituosos dos componentes, equipamentos e sistemas fornecidos não altera a data de início do período de garantia do conjunto do fornecimento em causa, que será o indicado no n.º 1 da presente cláusula. No entanto, o elemento reparado ou substituído terá um ano de garantia a partir da sua reparação ou substituição.',
      '12.5. Quando a garantia estipulada no n.º 1 da presente cláusula se executa através da substituição do elemento defeituoso, que por motivos de urgência deverá ser imediata, o Comprador compromete-se a enviar a peça ou elemento defeituoso à NAVEL no prazo máximo de 7 dias a contar da data de recepção da peça ou elemento de substituição. Caso a peça ou elemento substituído não seja devolvido, a NAVEL facturará a peça ou elemento de substituição a preço de catálogo.',
      '12.6. Em caso algum a NAVEL se responsabilizará por reparações efectuadas por pessoal que não esteja incluído na sua organização.',
      '12.7. A presente garantia não cobre danos ou defeitos decorrentes da normal utilização e desgaste dos equipamentos. Encontram-se também excluídos do âmbito da garantia, sendo que provocarão a sua extinção, quaisquer danos ou defeitos causados pela imprópria manutenção, armazenamento e utilização incorrecto ou negligente, variações na qualidade do fornecimento de energia (voltagem, frequência, distúrbios) modificações no fornecimento feitas sem a aprovação da NAVEL, instalações realizadas ou modificadas posteriormente em incumprimento das instruções técnicas do produto, e, em geral, qualquer causa que não seja atribuível à NAVEL ou ao fabricante. Pela sua natureza e interface com o operador, componentes como sejam os cabos eléctricos, fichas de ligação e interruptores não são abrangidos por garantia, salvo convenção diferente do fabricante.',
      '12.8. A presente garantia considerar-se-á também terminada se, no caso de ser estipulado que o fornecimento tenha início na presença da NAVEL, ou que sejam postos a trabalhar na presença de pessoal da NAVEL, e tal não tenha sido cumprido ou, em caso de falha, não sejam tomadas medidas para mitigar os danos provocados por tal falha.',
      '12.9. Pela sua natureza, a NAVEL reserva-se o direito de propor ao cliente a celebração de um contrato de manutenção dos equipamentos destinados a uso profissional, de acordo com o manual do fabricante, para salvaguarda das condições de Garantia.',
      '12.10. Sem prejuízo das disposições da presente cláusula, a NAVEL não é responsável por defeitos nos equipamentos e materiais fornecidos por mais de dois anos a contar do início do prazo indicado no n.º 1 da presente cláusula.',
    ],
  },
  {
    id: '13',
    title: '13. GARANTIAS EM MECÂNICA-HIDRAULICA E SERVIÇO DE TORNOS',
    paragraphs: [
      '13.1. Dadas as características específicas das reparações em mecânica-hidraulica e em serviços de tornos, a NAVEL garante os mesmos contra os defeitos de execução bem como contra todos os defeitos de matéria-prima do equipamento em causa, durante um prazo de 6 (seis) meses a contar da entrega, salvo outro prazo estipulado na Aceitação da Encomenda, cabendo sempre ao Comprador a prova dos defeitos alegados. O equipamento alegadamente defeituoso deverá ser conservado para inspecção da NAVEL.',
      '13.2. Considera-se que o prazo da garantia expirou se tiver ultrapassado o tempo de vida estipulado e indicado pela NAVEL ao Comprador relativamente àquele equipamento, ou quando os equipamentos, depois de entregues, tenham sido sujeitos a abusos de utilização, sofrido acidentes, modificações ou reparações por entidades que não as autorizadas pela NAVEL, armazenamento impróprio, má utilização, manutenção inadequada, não cumprimento das instruções de utilização, negligência ou falta de vigilância ou, no caso de descoberta de um defeito, o comprador não tomar todas as medidas consideradas necessárias (como a sua paragem imediata) no sentido de evitar o agravamento desse problema. A NAVEL reserva-se o direito de inspeccionar qualquer reclamação de defeito no equipamento efectuada pelo Comprador, antes de tomar qualquer iniciativa de o corrigir.',
      '13.3. Esta garantia encontra-se exclusivamente limitada à reparação ou substituição em local designado pela NAVEL, das peças colocadas fora de serviço devido a defeitos, reservando-se a NAVEL o direito de modificar os dispositivos fornecidos de maneira a reparar ou a substituir as peças defeituosas.',
      '13.4. Os trabalhos levados a cabo pelo Comprador, sob orientação e indicações deste, não beneficiam de qualquer garantia, salvo outra convenção em contrário, previamente acordada por escrito.',
    ],
  },
  {
    id: '14',
    title: '14. HORÁRIO DE TRABALHO E INSTALAÇÕES',
    paragraphs: [
      '14.1. A NAVEL adaptará, na medida do possível, o horário de trabalho dos seus trabalhadores ou colaboradores com o horário de trabalho das instalações em que tenha lugar a prestação de serviços, suas ou do cliente. No entanto, quando for necessário evitar qualquer interferência com a actividade industrial das instalações, o Cliente deverá propor execução alternativa de trabalhos, compatível com as competências técnicas da equipa em campo ou, alternativamente, assumir os custos associados com a interrupção do trabalho.',
      '14.2. Em qualquer caso, o horário de trabalho dos trabalhadores da NAVEL ou dos seus subcontratados deve sempre cumprir a legislação laboral e as convenções colectivas de trabalho aplicáveis ao seu sector de actividade relativamente à duração e horário do trabalho, prestação de trabalho suplementar e nocturno, e pausas.',
      '14.3. Qualquer que seja o horário de trabalho adoptado, o Comprador deve providenciar aos trabalhadores da NAVEL e dos seus subcontratados o melhor ambiente de trabalho em termos de ambiente, higiene e segurança.',
    ],
  },
  {
    id: '15',
    title: '15. LIMITAÇÃO DE RESPONSABILIDADE',
    paragraphs: [
      'A responsabilidade da NAVEL por actos seus, dos seus trabalhadores, colaboradores, representantes, subcontratados e fornecedores que se traduzam no não cumprimento das suas obrigações contratuais, salvo no caso de actuação dolosa ou com culpa grave, não excederá, no seu total, o valor do preço base do contrato e, em caso algum, incluirá danos por lucros cessantes, perda de rendimentos, perda de utilização, perda de produção, custo de capital, custos decorrentes do equipamento, instalações ou serviços de substituição, custos decorrentes da indisponibilidade, de atrasos e de reclamações de clientes do Comprador, ou custos relacionados com a interrupção da operação ou outro tipo de danos especiais, indirectos ou emergentes (contratual, não contratual, objectiva ou decorrente de garantias ou outros). O disposto na presente cláusula não se aplica a eventuais danos causados à vida, integridade moral ou física ou à saúde das pessoas.',
    ],
  },
  {
    id: '16',
    title: '16. LEGISLAÇÃO E JURISDIÇÃO COMPETENTES',
    paragraphs: [
      'As Partes renunciam expressamente a qualquer outra legislação eventualmente aplicável a qualquer uma delas e aceitam submeter qualquer diferente que surja relativamente à execução das Condições Gerais à legislação Portuguesa e à jurisdição do Tribunal da Comarca de Ponta Delgada.',
    ],
  },
]

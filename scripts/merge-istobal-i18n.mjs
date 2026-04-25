/**
 * One-shot helper: merge ISTOBAL i18n keys into pt, en, es.
 * Re-run if needed: node scripts/merge-istobal-i18n.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..', 'src', 'locales')

const PACK = {
  pt: {
    nav: { istobal: 'ISTOBAL' },
    hero: { slideIstobal: 'ISTOBAL — soluções de lavagem e cuidado de veículos' },
    milwaukee: {
      eyebrow: 'Parceria NAVEL nos Açores',
    },
    home: {
      brandMosaicHeading: 'Marcas em destaque',
      milwaukeeSectionTitle: 'Ferramentas profissionais — Milwaukee',
      milwaukeeSectionText:
        'Sistemas sem fios M18 e M12, ferramentas eléctricas e medição para oficina e indústria. Representação NAVEL nos Açores — catálogos, disponibilidade e apoio técnico.',
      milwaukeeSectionCta: 'Ver Milwaukee',
      campaignIstobalBrand: 'ISTOBAL',
      campaignIstobalTitle: 'Lavagem profissional e cuidado de veículos',
      campaignInternalHint: 'Ir para a página dedicada',
      istobalSectionTitle: 'Lavagem de veículos — ISTOBAL',
      istobalSectionText:
        'Soluções de lavagem e cuidado de veículos para oficinas, frotas e operadores. A NAVEL comercializa e apoia equipamentos ISTOBAL nos Açores — projecto, instalação e pós-venda.',
      istobalSectionCta: 'Conhecer a ISTOBAL',
    },
    products: {
      istobalHighlightTitle: 'Equipamentos de lavagem ISTOBAL',
      istobalHighlightText:
        'Túneis e rolantes de lavagem, jet wash, self-service, linhas para pesados e soluções de eficiência hídrica — com apoio local da NAVEL nos Açores.',
      istobalHighlightCta: 'Ver página dedicada',
    },
    istobal: {
      eyebrow: 'Parceria NAVEL nos Açores',
      title: 'ISTOBAL',
      lead:
        'A ISTOBAL é um grupo multinacional espanhol líder no desenho, fabrico e comercialização de soluções para a lavagem e o cuidado de veículos. Com mais de 75 anos de experiência, alia inovação e alta tecnologia a produtos e serviços que aumentam a rentabilidade dos negócios de lavagem dos clientes e valor para os utilizadores finais — com foco em sustentabilidade, eficiência e transformação digital.',
      whyTitle: 'Porquê ISTOBAL',
      whyText:
        'A ISTOBAL oferece produtos e serviços de última geração, adaptados a diferentes sectores e geografias, em estreita colaboração com marcas globais dos sectores automóvel, transporte e mobilidade, através de uma ampla rede de distribuidores, 17 filiais internacionais e 5 fábricas e centros de montagem. (Síntese com base em istobal.com/pt.)',
      feature1:
        'Soluções integrais orientadas para a sustentabilidade, eficiência e transformação digital — tecnologias mais produtivas, intuitivas e seguras.',
      feature2:
        'Presença em mais de 80 países; cerca de 70% das vendas destinadas a mercados internacionais (dados divulgados pela ISTOBAL).',
      feature3:
        'Cerca de 1 milhão de lavagens realizadas com a tecnologia ISTOBAL; mais de 30 000 máquinas de lavagem instaladas no mundo (dados divulgados pela ISTOBAL).',
      feature4:
        'Das linhas de túnel e rolante ao self-service e aplicações especializadas — a NAVEL apoia especificação, fornecimento e assistência nos Açores.',
      segmentsTitle: 'Famílias de soluções',
      segment1: 'Linhas de lavagem túnel, rolante e lavagem comercial',
      segment2: 'Lavagem self-service, jet wash e equipamento complementar',
      segment3: 'Soluções para pesados — camiões, autocarros e veículos industriais',
      segment4: 'Tratamento de águas, poupança e eficiência (conforme projecto)',
      segment5: 'Serviços digitais e conectividade para operadores de lavagem',
      statsAria: 'Destaques divulgados pela ISTOBAL',
      statCountriesNum: '80+',
      statCountries: 'Países onde operam produtos e serviços ISTOBAL',
      statExportNum: '70%',
      statExport: 'Vendas internacionais no total (orientação export)',
      statWashesNum: '1M',
      statWashes: 'Lavagens realizadas com tecnologia ISTOBAL',
      statMachinesNum: '30.000',
      statMachines: 'Máquinas de lavagem instaladas no mundo',
      statsNote:
        'Os números citados baseiam-se em informação pública em istobal.com e podem ser actualizados pela marca.',
      sustainabilityTitle: 'Compromisso com a sustentabilidade',
      sustainabilityText:
        'Na ISTOBAL, o compromisso com a sustentabilidade reforça a resiliência ao longo da cadeia de valor — procurando eficiência, adaptabilidade e transparência e apoiando a inovação e a gestão de risco. (Síntese com base em istobal.com/pt.)',
      ctaOfficial: 'Site oficial ISTOBAL (PT)',
      ctaContact: 'Contactar a NAVEL',
      catalogText:
        'Para catálogos, esquemas técnicos, propostas ou assistência nos Açores, fale com a nossa equipa comercial.',
      ctaCatalog: 'Pedir informações',
      ctaTitle: 'Projecto ou orçamento?',
      ctaText:
        'Apoiamos a especificação, o fornecimento e o pós-venda de equipamentos de lavagem ISTOBAL no arquipélago.',
      ctaButton: 'Contacte-nos',
      galleryTitle: 'Soluções ISTOBAL em imagem',
      gallerySourceNote:
        'Imagens de referência publicitária ISTOBAL (istobal.com). Direitos reservados à marca.',
      galleryPrev: 'Diapositivo anterior',
      galleryNext: 'Diapositivo seguinte',
      galleryGoTo: 'Ir para o diapositivo {{n}}',
      gallerySlideStatus: 'Diapositivo {{current}} de {{total}}',
      slideCaption1: 'Tecnologia de lavagem e cuidado de veículos',
      slideCaption2: 'Soluções para instalações profissionais de lavagem',
      slideCaption3: 'Linhas de lavagem e equipamento de elevado desempenho',
      slideCaption4: 'Eficiência operacional e sustentabilidade',
      slideCaption5: 'Inovação ISTOBAL ao serviço do negócio de lavagem',
    },
  },
  en: {
    nav: { istobal: 'ISTOBAL' },
    hero: { slideIstobal: 'ISTOBAL — vehicle wash and care solutions' },
    milwaukee: {
      eyebrow: 'NAVEL partnership in the Azores',
    },
    home: {
      brandMosaicHeading: 'Featured brands',
      milwaukeeSectionTitle: 'Professional power tools — Milwaukee',
      milwaukeeSectionText:
        'M18 and M12 cordless systems, power tools and measurement for workshop and industry. NAVEL representation in the Azores — catalogues, availability and technical support.',
      milwaukeeSectionCta: 'View Milwaukee',
      campaignIstobalBrand: 'ISTOBAL',
      campaignIstobalTitle: 'Professional vehicle wash and care',
      campaignInternalHint: 'Go to dedicated page',
      istobalSectionTitle: 'Vehicle wash — ISTOBAL',
      istobalSectionText:
        'Vehicle wash and care solutions for workshops, fleets and operators. NAVEL supplies and supports ISTOBAL equipment in the Azores — project planning, installation and after-sales.',
      istobalSectionCta: 'Discover ISTOBAL',
    },
    products: {
      istobalHighlightTitle: 'ISTOBAL vehicle wash equipment',
      istobalHighlightText:
        'Tunnel and rollover wash systems, jet wash, self-service, heavy-duty lines and water-efficiency solutions — with local support from NAVEL in the Azores.',
      istobalHighlightCta: 'View dedicated page',
    },
    istobal: {
      eyebrow: 'NAVEL partnership in the Azores',
      title: 'ISTOBAL',
      lead:
        'ISTOBAL is a Spanish multinational group that leads the design, manufacture and marketing of vehicle wash and care solutions. With more than 75 years of experience, it combines innovation and advanced technology with products and services that improve profitability for wash businesses and value for end users — focusing on sustainability, efficiency and digital transformation.',
      whyTitle: 'Why ISTOBAL',
      whyText:
        'ISTOBAL delivers state-of-the-art products and services for many sectors and regions, working with global automotive, transport and mobility brands through a broad distributor network, 17 international subsidiaries and 5 manufacturing and assembly plants. (Summary based on istobal.com/pt.)',
      feature1:
        'End-to-end solutions focused on sustainability, efficiency and digital transformation — more productive, intuitive and safe technologies.',
      feature2:
        'Presence in 80+ countries; around 70% of sales are international / export-oriented (figures published by ISTOBAL).',
      feature3:
        'Around 1 million washes carried out with ISTOBAL technology; more than 30,000 wash machines installed worldwide (figures published by ISTOBAL).',
      feature4:
        'From tunnel and rollover lines to self-service and specialised applications — NAVEL supports specification, supply and service in the Azores.',
      segmentsTitle: 'Solution families',
      segment1: 'Tunnel, rollover and commercial wash lines',
      segment2: 'Self-service wash, jet wash and complementary equipment',
      segment3: 'Heavy-duty solutions — trucks, buses and industrial vehicles',
      segment4: 'Water treatment, savings and efficiency (project-dependent)',
      segment5: 'Digital services and connectivity for wash operators',
      statsAria: 'Highlights published by ISTOBAL',
      statCountriesNum: '80+',
      statCountries: 'Countries where ISTOBAL products and services operate',
      statExportNum: '70%',
      statExport: 'Share of international sales (export-oriented)',
      statWashesNum: '1M',
      statWashes: 'Washes carried out with ISTOBAL technology',
      statMachinesNum: '30,000',
      statMachines: 'Wash machines installed worldwide',
      statsNote:
        'Figures are based on public information on istobal.com and may be updated by the brand.',
      sustainabilityTitle: 'Commitment to sustainability',
      sustainabilityText:
        'ISTOBAL states that its sustainability commitment strengthens resilience across the value chain — seeking efficiency, adaptability and transparency and supporting innovation and risk management. (Summary based on istobal.com/pt.)',
      ctaOfficial: 'Official ISTOBAL website (PT)',
      ctaContact: 'Contact NAVEL',
      catalogText:
        'For catalogues, technical layouts, quotations or support in the Azores, contact our sales team.',
      ctaCatalog: 'Request information',
      ctaTitle: 'Project or quotation?',
      ctaText:
        'We support specification, supply and after-sales for ISTOBAL wash equipment across the archipelago.',
      ctaButton: 'Contact us',
      galleryTitle: 'ISTOBAL in pictures',
      gallerySourceNote:
        'Reference images from ISTOBAL marketing (istobal.com). All rights reserved by the brand.',
      galleryPrev: 'Previous slide',
      galleryNext: 'Next slide',
      galleryGoTo: 'Go to slide {{n}}',
      gallerySlideStatus: 'Slide {{current}} of {{total}}',
      slideCaption1: 'Vehicle wash and care technology',
      slideCaption2: 'Solutions for professional wash facilities',
      slideCaption3: 'High-performance wash lines and equipment',
      slideCaption4: 'Operational efficiency and sustainability',
      slideCaption5: 'ISTOBAL innovation for the wash business',
    },
  },
  es: {
    nav: { istobal: 'ISTOBAL' },
    hero: { slideIstobal: 'ISTOBAL — soluciones de lavado y cuidado del vehículo' },
    milwaukee: {
      eyebrow: 'Colaboración NAVEL en Azores',
    },
    home: {
      brandMosaicHeading: 'Marcas destacadas',
      milwaukeeSectionTitle: 'Herramientas profesionales — Milwaukee',
      milwaukeeSectionText:
        'Sistemas inalámbricos M18 y M12, herramientas eléctricas y medición para taller e industria. Representación NAVEL en Azores — catálogos, disponibilidad y soporte técnico.',
      milwaukeeSectionCta: 'Ver Milwaukee',
      campaignIstobalBrand: 'ISTOBAL',
      campaignIstobalTitle: 'Lavado profesional y cuidado del vehículo',
      campaignInternalHint: 'Ir a la página dedicada',
      istobalSectionTitle: 'Lavado de vehículos — ISTOBAL',
      istobalSectionText:
        'Soluciones de lavado y cuidado del vehículo para talleres, flotas y operadores. NAVEL comercializa y apoya equipos ISTOBAL en Azores — proyecto, instalación y posventa.',
      istobalSectionCta: 'Descubrir ISTOBAL',
    },
    products: {
      istobalHighlightTitle: 'Equipos de lavado ISTOBAL',
      istobalHighlightText:
        'Túneles y puentes de lavado, jet wash, self-service, líneas para pesados y soluciones de eficiencia hídrica — con apoyo local de NAVEL en Azores.',
      istobalHighlightCta: 'Ver página dedicada',
    },
    istobal: {
      eyebrow: 'Colaboración NAVEL en Azores',
      title: 'ISTOBAL',
      lead:
        'ISTOBAL es un grupo multinacional español líder en el diseño, fabricación y comercialización de soluciones para el lavado y el cuidado del vehículo. Con más de 75 años de experiencia, une innovación y alta tecnología a productos y servicios que mejoran la rentabilidad del negocio de lavado y el valor para el usuario — con foco en sostenibilidad, eficiencia y transformación digital.',
      whyTitle: 'Por qué ISTOBAL',
      whyText:
        'ISTOBAL ofrece productos y servicios de última generación adaptados a distintos sectores y geografías, colaborando con marcas globales de automoción, transporte y movilidad mediante una amplia red de distribuidores, 17 filiales internacionales y 5 fábricas y centros de montaje. (Síntesis según istobal.com/pt.)',
      feature1:
        'Soluciones integrales orientadas a la sostenibilidad, eficiencia y transformación digital — tecnologías más productivas, intuitivas y seguras.',
      feature2:
        'Presencia en más de 80 países; alrededor del 70% de las ventas con orientación a mercados internacionales (datos publicados por ISTOBAL).',
      feature3:
        'Cerca de 1 millón de lavados con tecnología ISTOBAL; más de 30.000 máquinas de lavado instaladas en el mundo (datos publicados por ISTOBAL).',
      feature4:
        'Desde túneles y puentes hasta self-service y aplicaciones especializadas — NAVEL apoya especificación, suministro y asistencia en Azores.',
      segmentsTitle: 'Familias de soluciones',
      segment1: 'Líneas de lavado túnel, puente y lavado comercial',
      segment2: 'Lavado self-service, jet wash y equipo complementario',
      segment3: 'Soluciones para pesados — camiones, autobuses y vehículos industriales',
      segment4: 'Tratamiento de aguas, ahorro y eficiencia (según proyecto)',
      segment5: 'Servicios digitales y conectividad para operadores de lavado',
      statsAria: 'Datos destacados publicados por ISTOBAL',
      statCountriesNum: '80+',
      statCountries: 'Países donde operan productos y servicios ISTOBAL',
      statExportNum: '70%',
      statExport: 'Ventas internacionales en el total (orientación exportación)',
      statWashesNum: '1M',
      statWashes: 'Lavados realizados con tecnología ISTOBAL',
      statMachinesNum: '30.000',
      statMachines: 'Máquinas de lavado instaladas en el mundo',
      statsNote:
        'Las cifras se basan en la información pública de istobal.com y pueden ser actualizadas por la marca.',
      sustainabilityTitle: 'Compromiso con la sostenibilidad',
      sustainabilityText:
        'ISTOBAL indica que su compromiso con la sostenibilidad refuerza la resiliencia en toda la cadena de valor — eficiencia, adaptabilidad y transparencia, apoyando innovación y gestión de riesgos. (Síntesis según istobal.com/pt.)',
      ctaOfficial: 'Web oficial ISTOBAL (PT)',
      ctaContact: 'Contactar con NAVEL',
      catalogText:
        'Para catálogos, planos técnicos, ofertas o asistencia en Azores, contacte con nuestro equipo comercial.',
      ctaCatalog: 'Solicitar información',
      ctaTitle: '¿Proyecto o presupuesto?',
      ctaText:
        'Apoyamos la especificación, el suministro y la posventa de equipos de lavado ISTOBAL en el archipiélago.',
      ctaButton: 'Contáctenos',
      galleryTitle: 'Soluciones ISTOBAL en imágenes',
      gallerySourceNote:
        'Imágenes de marketing de referencia ISTOBAL (istobal.com). Derechos reservados por la marca.',
      galleryPrev: 'Diapositiva anterior',
      galleryNext: 'Diapositiva siguiente',
      galleryGoTo: 'Ir a la diapositiva {{n}}',
      gallerySlideStatus: 'Diapositiva {{current}} de {{total}}',
      slideCaption1: 'Tecnología de lavado y cuidado del vehículo',
      slideCaption2: 'Soluciones para instalaciones profesionales de lavado',
      slideCaption3: 'Líneas de lavado y equipamiento de alto rendimiento',
      slideCaption4: 'Eficiencia operativa y sostenibilidad',
      slideCaption5: 'Innovación ISTOBAL al servicio del negocio de lavado',
    },
  },
}

const SERVICES_LINE = {
  pt: 'Linhas de lavagem ISTOBAL — comercialização, instalação e assistência técnica',
  en: 'ISTOBAL wash lines — supply, installation and technical support',
  es: 'Líneas de lavado ISTOBAL — suministro, instalación y asistencia técnica',
}

function deepAssign(target, source) {
  for (const [k, v] of Object.entries(source)) {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      if (!target[k] || typeof target[k] !== 'object') target[k] = {}
      deepAssign(target[k], v)
    } else {
      target[k] = v
    }
  }
}

for (const lang of ['pt', 'en', 'es']) {
  const filePath = path.join(root, `${lang}.json`)
  const j = JSON.parse(fs.readFileSync(filePath, 'utf8'))
  deepAssign(j, PACK[lang])
  const line = SERVICES_LINE[lang]
  if (Array.isArray(j.services?.area3Items) && !j.services.area3Items.includes(line)) {
    j.services.area3Items = [...j.services.area3Items, line]
  }
  fs.writeFileSync(filePath, `${JSON.stringify(j)}\n`)
  console.log('OK', filePath)
}

export interface SidebarItem {
  label: string
  icon: string
  href: string
  keyboardShortcut?: string
  active?: boolean
}

export interface SidebarProfileMenuItem {
  label: string
  href: string
  danger?: boolean
  icon?: string
}

export interface SidebarSectionBase {
  id: string
  type: string
  label: string
}

export interface SidebarNavigationSection extends SidebarSectionBase {
  type: "navigation"
  items: SidebarItem[]
}

export interface SidebarFiltersSection extends SidebarSectionBase {
  type: "filters"
  content: {
    tipo_de_conteudo: {
      label: string
      selecao: "um por vez"
      opcoes: {
        id: string
        rotulo: string
        observacao?: string
      }[]
    }
    subfiltros_combinaveis: {
      label: string
      opcoes: {
        id: string
        rotulo: string
      }[]
    }
  }
}

export interface SidebarOrdenacaoSection extends SidebarSectionBase {
  type: "ordenacao"
  content: {
    controle: {
      desktop: string
      mobile_e_tablet: string
    }
    opcoes_gerais: {
      id: string
      rotulo: string
      descricao?: string
    }[]
    opcoes_condicionais: {
      id: string
      rotulo: string
      aparece_quando?: string
      efeito?: string
      sincronizacao?: string
    }[]
  }
}

export interface SidebarViewModesSection extends SidebarSectionBase {
  type: "view-modes"
  content: {
    opcoes: {
      id: string
      rotulo: string
      descricao: string
    }[]
    biblioteca_expandida: string
    configuracao: string
  }
}

export interface SidebarCreateSection extends SidebarSectionBase {
  type: "create"
  content: {
    controle: string
    opcoes: {
      id: string
      rotulo: string
    }[]
  }
}

export interface SidebarFixedItemsSection extends SidebarSectionBase {
  type: "fixed-items"
  content: {
    limite_atual: number
    limite_anterior: number
    desde: string
    disponibilidade: string
    tipos_aceitos: string[]
    finalidade: string
    mobile: string
  }
}

export interface SidebarLayoutColumnSection extends SidebarSectionBase {
  type: "layout-column"
  content: {
    redimensionar: string
    expandir: string
    recolher: string
  }
}

export interface SidebarMobileBehavior {
  mode: "drawer" | "bottom-nav"
  busca: string
  dentro_de_uma_playlist?: {
    mobile_e_tablet: {
      filtros_e_busca: string
    }
  }
}

export interface SidebarHeader {
  titulo: string
  subtitulo?: string
  profileMenu?: SidebarProfileMenuItem[]
}

export type SidebarSection =
  | SidebarNavigationSection
  | SidebarFiltersSection
  | SidebarOrdenacaoSection
  | SidebarViewModesSection
  | SidebarCreateSection
  | SidebarFixedItemsSection
  | SidebarLayoutColumnSection
export const FISH_DATA = {
    "GOLDFISH": {
        id: "GOLDFISH",
        name: "변이 금붕어",
        scientificName: "Mini Mutant",
        component: "MUTANT_SCALE",
        componentName: "변종 비늘",
        description: "가장 흔하게 볼 수 있는 변이 어종입니다. 작지만 방사능에 강한 내성을 가지고 있습니다."
    },
    "NEON_TETRA": {
        id: "NEON_TETRA",
        name: "세슘 지느러미",
        scientificName: "Cesium-Fin Tetra",
        component: "ISOTOPE_BATTERY",
        componentName: "농축 방사능 배터리",
        description: "표층에 쌓인 낙진 중 '세슘-137'을 지느러미에 농축시켜 스스로 빛을 냅니다."
    },
    "MACKEREL": {
        id: "MACKEREL",
        name: "독성 고등어",
        scientificName: "Toxic Mackerel",
        component: "TOXIC_FIN",
        componentName: "독성 가시 지느러미",
        description: "오염된 해수면 근처에서 서식하며 날카로운 독성 가시를 지니게 되었습니다."
    },
    "CATFISH": {
        id: "CATFISH",
        name: "납껍질 갑옷메기",
        scientificName: "Lead-Plated Catfish",
        component: "ANTI_RAD_LEAD",
        componentName: "항방사선 납 합금",
        description: "해저로 가라앉은 도시의 고철과 납 성분을 섭취하여 방사선을 차단하는 두꺼운 외피를 형성했습니다."
    },
    "SALMON": {
        id: "SALMON",
        name: "방사능 연어",
        scientificName: "Irradiated Salmon",
        component: "RAD_ENZYME",
        componentName: "방사능 내성 효소",
        description: "강한 방사능 속에서도 회귀 본능을 유지하기 위해 특수한 효소를 분비하도록 변이되었습니다."
    },
    "TUNA": {
        id: "TUNA",
        name: "마그마 튜나",
        scientificName: "Magma Tuna",
        component: "THERMAL_CORE",
        componentName: "열에너지 핵",
        description: "차가운 심해에서도 체온을 유지하기 위해 고온의 에너지를 유지하는 심장을 가졌습니다."
    },
    "SWORDFISH": {
        id: "SWORDFISH",
        name: "강철 비늘 장어",
        scientificName: "Steel-Scale Eel", // 맵핑 필요성 확인
        component: "HIGH_VOLTAGE_ORGAN",
        componentName: "고전압 발전 장기",
        description: "강철처럼 단단한 비늘과 강력한 전기를 뿜어내는 장기를 가졌습니다."
    },
    "ANGLERFISH": {
        id: "ANGLERFISH",
        name: "스트론튬 초롱아귀",
        scientificName: "Strontium Angler",
        component: "GLOW_BONE",
        componentName: "반영구 발광 골격",
        description: "뼈 성분을 스트론튬-90으로 대체하여 영구적인 빛을 발산하는 골격을 가졌습니다."
    },
    "SHARK": {
        id: "SHARK",
        name: "핵겨울 상어",
        scientificName: "Rad-Winter Shark",
        component: "PREDATOR_TOOTH",
        componentName: "포식자의 오염된 이빨",
        description: "심해의 최상위 포식자로, 방사능으로 인해 공격성이 극도로 강화되었습니다."
    },
    "KRAKEN": {
        id: "KRAKEN",
        name: "플루토늄 가디언",
        scientificName: "The Plutonium Kraken",
        component: "REACTOR_CORE",
        componentName: "오리지널 원자로 코어",
        description: "침몰한 핵잠수함의 원자로를 둥지로 삼아 거대화된 개체입니다."
    }
};

export class DataManager {
    constructor() {
        this.fishData = FISH_DATA;
    }

    getFish(id) {
        return this.fishData[id] || null;
    }

    getAllFish() {
        return Object.values(this.fishData);
    }

    getFishByDepth(depth) {
        return Object.values(this.fishData).filter(f =>
            depth >= f.minDepth && depth <= f.maxDepth
        );
    }
}

export const dataManager = new DataManager();

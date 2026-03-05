export class LanguageManager {
    constructor() {
        this.languages = {
            ko: {
                // HUD Labels
                "hp": "내구도",
                "gulp": "포만감",
                "fuel": "연료",
                "rad": "방사능",
                "depth": "수심",
                "fish": "물고기",
                "money": "자금",
                "time": "시간",
                "buoyancy": "부력",
                "weight": "무게",
                "return_spd": "회수 속도",

                // UI Headers
                "inventory": "인벤토리 (가방)",
                "encyclopedia": "물고기 도감",
                "boat_upgrade": "선박 개조 (업그레이드)",
                "live_well": "활어조 (수조)",
                "controls_help": "조작 도움말",
                "debug_menu": "디버그 / 치트 메뉴",

                // Shop / VN
                "neutral_zone": "중립 구역 / 섹터 04",
                "esc_to_leave": "[ ESC ] 눌러서 나가기",
                "leave": "떠나기",
                "sell_inventory": "인벤토리 판매",
                "buy_supplies": "보급품 구매",

                // Upgrades
                "u_speed": "엔진 출력 (속도)",
                "u_armor": "강화 장갑 (내구도)",
                "u_light": "심해 서치라이트",
                "u_rad_resist": "방사능 차폐막",

                // Messages
                "day_complete": "하루 일과 종료",
                "total_catch": "총 포획량",
                "earned": "획득 자금",
                "upgrade": "강화하기",
                "close": "닫기",

                // Controls Guide (Footer)
                "c_boat_world": "월드 이동 (A/D)",
                "c_boat_local": "보트 이동 (Q/E)",
                "c_player_local": "캐릭터 이동 (방향키)",
                "c_help": "도움말 (H)",
                "c_bag": "가방 (I)",
                "c_guide": "도감 (G)",
                "c_tank": "수조 (T)",
                "c_refit": "개조 (U)",
                "c_feed": "먹이 (F)",
                "c_pet": "교감 (X)",
                "c_debug": "디버그 (9)",
                "c_reset": "재시작 (R)",

                // Detailed Help Menu
                "h_title": "조작 및 단축키 안내",
                "h_move_title": "[ 이동 시스템 ]",
                "h_move_1": "• ← → (방향키): 보트 내 캐릭터 이동 (배경 고정)",
                "h_move_2": "• Q / E: 화면 내 보트 이동 (배경 고정)",
                "h_move_3": "• A / D: 월드 맵 항해 (배경/카메라 동적 이동)",
                "h_move_4": "• W / S: 선박 상하 조항 및 낚시 찌 수심 조절",
                "h_etc_title": "[ 기타 단축키 ]",
                "h_etc_1": "• I: 인벤토리 / G: 물고기 도감 / T: 활어 수조 / U: 선박 개조",
                "h_etc_2": "• F: 펫 먹이 주기 / X: 펫과 교감하기",
                "h_etc_3": "• M: 전체 지도 보기 / SPACE: 낚시 시작 / R: 게임 재시작",

                // Upgrade Details
                "up_speed_name": "엔진 트랜스미션",
                "up_speed_desc": "이동 속도가 증가하고 연료 효율이 좋아집니다.",
                "up_armor_name": "항방사선 선체 장갑",
                "up_armor_desc": "최대 내구도(HP)가 증가하고 충돌 저항이 강화됩니다.",
                "up_light_name": "심해 탐사 서치라이트",
                "up_light_desc": "심해에서도 물속을 더 멀리 볼 수 있습니다.",
                "up_rad_name": "방사능 차폐 필터",
                "up_rad_desc": "방사능 축적 속도가 감소합니다.",
                "up_need": "필요",

                // UI Status Messages
                "empty_bag": "가방이 비어 있습니다.",
                "empty_tank": "수조가 비어 있습니다.",
                "not_discovered": "아직 발견하지 못함",
                "caught_depth": "잡힌 깊이",
                "owned_count": "보유",
                "per_unit": "개당",
                "no_sell_items": "팔 물건이 없습니다.",

                // Shop Items
                "item_fuel_name": "연료 전지",
                "item_fuel_desc": "연료를 30만큼 보충합니다.",
                "item_repair_name": "긴급 수리 키트",
                "item_repair_desc": "선체 내구도를 20만큼 복구합니다.",
                "item_ration_name": "전투 식량",
                "item_ration_desc": "포만감을 40만큼 해소합니다.",
                "item_water_name": "정화된 물",
                "item_water_desc": "방사능을 10만큼 세척합니다.",
                "svc_purify_name": "방사능 정밀 세척",
                "svc_purify_desc": "선체의 모든 방사능을 제거합니다.",

                // Pet Specific
                "p_petting": "교감하기 (쓰다듬기)",
                "p_feed": "먹이 주기",
                "p_happy": "기분 좋음! ❤️",
                "p_hungry": "배고파요... 🐟",
                "p_gift": "오리가 선물을 물어왔습니다!",
                "p_friendship": "호감도",
                "p_level_up": "오리와 더 친해졌습니다!",

                // Scenario Items
                "HIGH_DENSITY_BONE": "고밀도 뼈 (Rift용)",
                "STABILIZER_PART": "안정화 부품",
                "ANTI_RAD_SCALE": "항방사선 비늘",
                "METAL_SCRAP": "고철",
                "LUMINOUS_CELL": "발광 세포",
                "TECH_CORE": "테크 코어",
                "OLD_SENSOR": "망가진 센서",
                "scavenge": "수집",

                // Item Actions
                "use": "사용",
                "eat": "먹기",
                "restored_hp": "내구도 회복됨!",
                "restored_fuel": "연료 보충됨!",
                "restored_hunger": "포만감 회복됨!",
                "rad_purified": "방사능 세척됨!",
                "rad_warning": "방사능 경고! 선체가 부식되고 있습니다!",
                "rad_visual_noise": "방사능 간섭 중...",
                "game_over": "GAME OVER",
                "reason_hp": "선체가 파손되었습니다.",
                "reason_hunger": "배가 고파서 더 이상 움직일 수 없습니다.",
                "reason_rad": "방사능 수치가 치사량을 넘었습니다.",
                "press_r_restart": "[ R ] 키를 눌러 재시작",
                "PURIFIED_WATER": "정화된 물",
                "purify_service": "방사능 전신 세척 ($500)",
                "purify_confirm": "방사능이 완전히 제거되었습니다."
            },
            en: {
                // HUD Labels
                "hp": "HP",
                "gulp": "GULP",
                "fuel": "FUEL",
                "rad": "RAD",
                "depth": "DEPTH",
                "fish": "FISH",
                "money": "MONEY",
                "time": "TIME",
                "buoyancy": "BUOYANCY",
                "weight": "WEIGHT",
                "return_spd": "RETURN SPD",

                // UI Headers
                "inventory": "INVENTORY (BAG)",
                "encyclopedia": "ENCYCLOPEDIA",
                "boat_upgrade": "BOAT REFIT (UPGRADE)",
                "live_well": "LIVE WELL (TANK)",
                "controls_help": "CONTROLS HELP",
                "debug_menu": "DEBUG / CHEAT MENU",

                // Shop / VN
                "neutral_zone": "NEUTRAL ZONE / SECTOR 04",
                "esc_to_leave": "[ ESC ] TO LEAVE",
                "leave": "LEAVE",
                "sell_inventory": "Sell Inventory",
                "buy_supplies": "Buy Supplies",

                // Upgrades
                "u_speed": "Engine Power (Speed)",
                "u_armor": "Reinforced Armor (HP)",
                "u_light": "Deep-sea Searchlight",
                "u_rad_resist": "Radiation Shield",

                // Messages
                "day_complete": "DAY COMPLETE",
                "total_catch": "Total Catch",
                "earned": "Earned",
                "upgrade": "Upgrade",
                "close": "Close",

                // Controls Guide (Footer)
                "c_boat_world": "Sail World (A/D)",
                "c_boat_local": "Move Boat (Q/E)",
                "c_player_local": "Move Player (Arrows)",
                "c_help": "Help (H)",
                "c_bag": "Bag (I)",
                "c_guide": "Guide (G)",
                "c_tank": "Tank (T)",
                "c_refit": "Refit (U)",
                "c_feed": "Feed (F)",
                "c_pet": "Pet (X)",
                "c_debug": "DEBUG (9)",
                "c_reset": "Reset (R)",

                // Detailed Help Menu
                "h_title": "Controls & Shortcuts",
                "h_move_title": "[ Movement System ]",
                "h_move_1": "• Left / Right Arrows: Character local move (Static BG)",
                "h_move_2": "• Q / E: Boat local move (Static BG)",
                "h_move_3": "• A / D: Sail the world (Dynamic BG/Camera)",
                "h_move_4": "• W / S: Steer boat up/down & Adjust bobber depth",
                "h_etc_title": "[ Miscellaneous ]",
                "h_etc_1": "• I: Inventory / G: Encyclopedia / T: Live Well / U: Ship Refit",
                "h_etc_2": "• F: Feed Pet / X: Pet Duck",
                "h_etc_3": "• M: World Map / SPACE: Cast Line / R: Restart Game",

                // Upgrade Details
                "up_speed_name": "Engine Transmission",
                "up_speed_desc": "Increases movement speed and fuel efficiency.",
                "up_armor_name": "Radiation-proof Hull Armor",
                "up_armor_desc": "Increases max HP and collision resistance.",
                "up_light_name": "Deep-sea Searchlight",
                "up_light_desc": "Expands visibility in deep waters.",
                "up_rad_name": "Radiation Shield Filter",
                "up_rad_desc": "Reduces radiation accumulation rate.",
                "up_need": "Need",

                // UI Status Messages
                "empty_bag": "The bag is empty.",
                "empty_tank": "The tank is empty.",
                "not_discovered": "Not discovered yet",
                "caught_depth": "Caught at",
                "owned_count": "Owned",
                "per_unit": "per each",
                "no_sell_items": "Nothing to sell.",

                // Shop Items
                "item_fuel_name": "Fuel Cell",
                "item_fuel_desc": "Restores 30 units of fuel.",
                "item_repair_name": "Emergency Repair Kit",
                "item_repair_desc": "Restores 20 units of HP.",
                "item_ration_name": "Field Rations",
                "item_ration_desc": "Restores 40 units of hunger.",
                "item_water_name": "Purified Water",
                "item_water_desc": "Purifies 10 units of radiation.",
                "svc_purify_name": "Radiation Deep Cleanse",
                "svc_purify_desc": "Removes all radiation from the hull.",

                // Pet Specific
                "p_petting": "Petting",
                "p_feed": "Feed",
                "p_happy": "Happy! ❤️",
                "p_hungry": "Hungry... 🐟",
                "p_gift": "Duck brought a gift!",
                "p_friendship": "Friendship",
                "p_level_up": "Friends for life!",

                // Scenario Items
                "HIGH_DENSITY_BONE": "High-density Bone",
                "STABILIZER_PART": "Stabilizer Part",
                "ANTI_RAD_SCALE": "Anti-rad Scale",
                "METAL_SCRAP": "Metal Scrap",
                "LUMINOUS_CELL": "Luminous Cell",
                "TECH_CORE": "Tech Core",
                "OLD_SENSOR": "Old Sensor",
                "scavenge": "Scavenge",

                // Item Actions
                "use": "Use",
                "eat": "Eat",
                "restored_hp": "HP Restored!",
                "restored_fuel": "Fuel Restored!",
                "restored_hunger": "Hunger Restored!",
                "rad_purified": "Radiation Purified!",
                "rad_warning": "RADIATION WARNING! Hull Corroding!",
                "rad_visual_noise": "Radiation Interference...",
                "game_over": "GAME OVER",
                "reason_hp": "The hull has been destroyed.",
                "reason_hunger": "You have starved to death.",
                "reason_rad": "Radiation levels have exceeded lethal limits.",
                "press_r_restart": "Press [ R ] to restart",
                "PURIFIED_WATER": "Purified Water",
                "purify_service": "Hull Radiation Purify ($500)",
                "purify_confirm": "Radiation has been completely removed."
            }
        };

        this.currentLang = 'ko'; // Default to Korean
    }

    setLanguage(lang) {
        if (this.languages[lang]) {
            this.currentLang = lang;
        }
    }

    getLanguage() {
        return this.currentLang;
    }

    t(key) {
        return this.languages[this.currentLang][key] || key;
    }
}

export const languageManager = new LanguageManager();

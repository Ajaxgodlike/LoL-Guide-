/* ============================================
   LOL学习站 - API 模块
   Created by 粥粥
   ============================================ */

const LOLAPI = (() => {
    const BASE_URL = 'https://ddragon.leagueoflegends.com/cdn';
    const VERSION = '15.15.1';
    const CDN_URL = `${BASE_URL}/${VERSION}`;

    // 缓存
    let championDataCache = null;
    let championFullCache = {};

    // 职业标签中文映射
    const TAG_MAP = {
        'Fighter': '战士',
        'Mage': '法师',
        'Assassin': '刺客',
        'Marksman': '射手',
        'Tank': '坦克',
        'Support': '辅助'
    };

    // 技能键位映射
    const SPELL_KEYS = ['Q', 'W', 'E', 'R'];

    // 装备名称 → ID 映射（来自 Data Dragon item.json）
    const ITEM_ID_MAP = {
        '三相之力': 3078,
        '贪欲九头蛇': 6692,
        '破败王者之刃': 3153,
        '死亡之舞': 6333,
        '守护天使': 3026,
        '水银之靴': 3111,
        '卢登的伙伴': 326621,
        '虚空之杖': 3135,
        '中娅沙漏': 3157,
        '灭世者的死亡之帽': 3089,
        '无限法球': 3165,
        '法穿鞋': 3020,
        '暮刃': 6694,
        '幽梦之灵': 3142,
        '暗行者之爪': 6695,
        '赛瑞尔达的怨恨': 6696,
        '铁板靴': 3047,
        '无尽之刃': 3031,
        '幻影之舞': 3046,
        '饮血剑': 3072,
        '最后的轻语': 3033,
        '攻速鞋': 3006,
        '日炎圣盾': 3068,
        '荆棘之甲': 3075,
        '石像鬼石板甲': 3193,
        '自然之力': 4401,
        '兰顿之兆': 3143,
        '帝国指令': 4005,
        '舒瑞娅的战歌': 2065,
        '米凯尔的祝福': 3222,
        '救赎': 3107,
        '钢铁烈阳之匣': 3190
    };

    // 符文名称 → 图标路径映射（来自 runesReforged.json）
    const RUNE_ICON_MAP = {
        '征服者': 'perk-images/Styles/Precision/Conqueror/Conqueror.png',
        '凯旋': 'perk-images/Styles/Precision/Triumph.png',
        '传说：韧性': 'perk-images/Styles/Precision/LegendTenacity.png',
        '坚毅不倒': 'perk-images/Styles/Precision/LastStand.png',
        '电刑': 'perk-images/Styles/Domination/Electrocute/Electrocute.png',
        '恶意中伤': 'perk-images/Styles/Domination/CheapShot/CheapShot.png',
        '猛然冲击': 'perk-images/Styles/Domination/SuddenImpact/SuddenImpact.png',
        '终极猎人': 'perk-images/Styles/Domination/UltimateHunter/UltimateHunter.png',
        '致命节奏': 'perk-images/Styles/Precision/LethalTempo/LethalTempoTemp.png',
        '传说：血统': 'perk-images/Styles/Precision/LegendBloodline.png',
        '致命一击': 'perk-images/Styles/Precision/CutDown.png',
        '不灭之握': 'perk-images/Styles/Resolve/Grasp.png',
        '爆破': 'perk-images/Styles/Resolve/Demolish.png',
        '复苏之风': 'perk-images/Styles/Resolve/SecondWind.png',
        '过度生长': 'perk-images/Styles/Resolve/Overgrowth.png',
        '骸骨镀层': 'perk-images/Styles/Resolve/BonePlating.png',
        '复苏': 'perk-images/Styles/Resolve/Revitalize.png',
        '坚定': 'perk-images/Styles/Resolve/Unflinching.png',
        '守护者': 'perk-images/Styles/Resolve/Guardian.png',
        '生命源泉': 'perk-images/Styles/Resolve/FontOfLife.png',
        '饼干配送': 'perk-images/Styles/Inspiration/BiscuitDelivery/BiscuitDelivery.png',
        '星界洞悉': 'perk-images/Styles/Inspiration/CosmicInsight/CosmicInsight.png',
        '行近速率': 'perk-images/Styles/Resolve/ApproachVelocity/ApproachVelocity.png',
        '风暴聚集': 'perk-images/Styles/Sorcery/Ascendency.png',
        '法力流系带': 'perk-images/Styles/Sorcery/ManaflowBand.png',
        '超然': 'perk-images/Styles/Sorcery/Transcendence.png',
        '焦灼': 'perk-images/Styles/Sorcery/ArcaneComet.png',
        '突然冲击': 'perk-images/Styles/Domination/SuddenImpact/SuddenImpact.png',
        '无情猎手': 'perk-images/Styles/Domination/RelentlessHunter.png',
        '寻宝猎人': 'perk-images/Styles/Domination/TreasureHunter.png',
        '甜食专家': 'perk-images/Styles/Inspiration/PerfectTiming/AlchemistCabinet.png',
        '眼球收集器': 'perk-images/Styles/Domination/GrislyMementos.png'
    };

    // 获取英雄列表数据
    async function getChampionList() {
        if (championDataCache) return championDataCache;

        try {
            const response = await fetch(`${CDN_URL}/data/zh_CN/champion.json`);
            if (!response.ok) throw new Error('API 请求失败');
            const data = await response.json();
            championDataCache = data;
            return data;
        } catch (error) {
            console.error('获取英雄列表失败:', error);
            // 尝试备用版本
            try {
                const fallbackVersion = '15.14.1';
                const fallbackUrl = `${BASE_URL}/${fallbackVersion}/data/zh_CN/champion.json`;
                const response = await fetch(fallbackUrl);
                const data = await response.json();
                championDataCache = data;
                return data;
            } catch (e) {
                console.error('备用版本也失败了:', e);
                return null;
            }
        }
    }

    // 获取单个英雄的完整数据（含技能详情）
    async function getChampionDetail(championId) {
        if (championFullCache[championId]) return championFullCache[championId];

        try {
            const response = await fetch(`${CDN_URL}/data/zh_CN/champion/${championId}.json`);
            if (!response.ok) throw new Error('API 请求失败');
            const data = await response.json();
            const champion = data.data[championId];
            championFullCache[championId] = champion;
            return champion;
        } catch (error) {
            console.error(`获取英雄 ${championId} 详情失败:`, error);
            return null;
        }
    }

    // 获取英雄头像 URL
    function getChampionIconUrl(championId) {
        return `${CDN_URL}/img/champion/${championId}.png`;
    }

    // 获取英雄加载界面图片 URL
    function getChampionSplashUrl(championId, num = 0) {
        return `${CDN_URL}/img/champion/splash/${championId}_${num}.jpg`;
    }

    // 获取技能图标 URL
    function getSpellIconUrl(spell) {
        const match = spell.image.full;
        return `${CDN_URL}/img/spell/${match}`;
    }

    // 获取被动技能图标 URL
    function getPassiveIconUrl(passive) {
        return `${CDN_URL}/img/passive/${passive.image.full}`;
    }

    // 处理英雄列表数据，返回标准化数组
    function processChampionList(data) {
        if (!data || !data.data) return [];
        return Object.values(data.data).map(champ => ({
            id: champ.id,
            key: champ.key,
            name: champ.name,
            title: champ.title,
            blurb: champ.blurb,
            tags: champ.tags,
            partype: champ.partype,
            info: champ.info,
            stats: champ.stats,
            iconUrl: getChampionIconUrl(champ.id)
        }));
    }

    // 处理英雄详情数据
    function processChampionDetail(champ) {
        if (!champ) return null;

        const spells = champ.spells.map((spell, index) => ({
            id: spell.id,
            name: spell.name,
            description: spell.description,
            tooltip: spell.tooltip || '',
            key: SPELL_KEYS[index] || '',
            iconUrl: getSpellIconUrl(spell),
            cooldown: spell.cooldownBurn || '',
            cost: spell.costBurn || '',
            range: spell.rangeBurn || ''
        }));

        const passive = {
            name: champ.passive.name,
            description: champ.passive.description,
            iconUrl: getPassiveIconUrl(champ.passive)
        };

        return {
            id: champ.id,
            key: champ.key,
            name: champ.name,
            title: champ.title,
            blurb: champ.blurb,
            lore: champ.lore || champ.blurb,
            tags: champ.tags,
            partype: champ.partype,
            info: champ.info,
            stats: champ.stats,
            iconUrl: getChampionIconUrl(champ.id),
            splashUrl: getChampionSplashUrl(champ.id, 0),
            spells: spells,
            passive: passive,
            allytips: champ.allytips || [],
            enemytips: champ.enemytips || []
        };
    }

    // 获取推荐出装数据（使用静态数据，因为 Data Dragon 不直接提供出装推荐）
    function getRecommendedBuild(champ) {
        const role = champ.tags[0];
        const builds = {
            'Fighter': {
                items: ['三相之力', '贪欲九头蛇', '破败王者之刃', '死亡之舞', '守护天使', '水银之靴'],
                runes: ['征服者', '凯旋', '传说：韧性', '坚毅不倒', '爆破', '复苏之风', '复苏', '甜食专家']
            },
            'Mage': {
                items: ['卢登的伙伴', '虚空之杖', '中娅沙漏', '灭世者的死亡之帽', '无限法球', '法穿鞋'],
                runes: ['电刑', '恶意中伤', '眼球收集器', '终极猎人', '风暴聚集', '法力流系带', '超然', '焦灼']
            },
            'Assassin': {
                items: ['暮刃', '幽梦之灵', '暗行者之爪', '守护天使', '赛瑞尔达的怨恨', '铁板靴'],
                runes: ['电刑', '突然冲击', '眼球收集器', '终极猎人', '风暴聚集', '猛然冲击', '无情猎手', '寻宝猎人']
            },
            'Marksman': {
                items: ['无尽之刃', '幻影之舞', '饮血剑', '守护天使', '最后的轻语', '攻速鞋'],
                runes: ['致命节奏', '凯旋', '传说：血统', '致命一击', '爆破', '骸骨镀层', '复苏', '甜食专家']
            },
            'Tank': {
                items: ['日炎圣盾', '荆棘之甲', '石像鬼石板甲', '自然之力', '兰顿之兆', '铁板靴'],
                runes: ['不灭之握', '爆破', '复苏之风', '过度生长', '骸骨镀层', '复苏', '坚定', '过度生长']
            },
            'Support': {
                items: ['帝国指令', '舒瑞娅的战歌', '米凯尔的祝福', '救赎', '钢铁烈阳之匣', '法穿鞋'],
                runes: ['守护者', '生命源泉', '复苏之风', '过度生长', '饼干配送', '星界洞悉', '行近速率', '甜食专家']
            }
        };

        const build = builds[role] || builds['Fighter'];

        // 将装备名称数组转换为对象数组 [{id, name, iconUrl}]
        const items = build.items.map(name => ({
            id: ITEM_ID_MAP[name],
            name: name,
            iconUrl: getItemIconUrl(ITEM_ID_MAP[name])
        }));

        // 将符文名称数组转换为对象数组 [{name, iconUrl}]
        const runes = build.runes.map(name => ({
            name: name,
            iconUrl: getRuneIconUrl(RUNE_ICON_MAP[name])
        }));

        return { items, runes };
    }

    // 获取装备图标 URL
    function getItemIconUrl(itemId) {
        return `${CDN_URL}/img/item/${itemId}.png`;
    }

    // 获取符文图标 URL
    function getRuneIconUrl(iconPath) {
        return `${CDN_URL}/img/${iconPath}`;
    }

    // 获取克制关系建议（静态数据）
    function getCounterTips(champ) {
        const role = champ.tags[0];
        const tips = {
            'Fighter': {
                strong: '对抗坦克和射手时优势明显',
                weak: '注意控制技能和风筝',
                combo: '利用技能连招打出最大伤害，注意切入时机'
            },
            'Mage': {
                strong: '远程消耗能力强，团战输出高',
                weak: '身板脆，容易被刺客切入',
                combo: '保持安全距离，先手控制技能后接爆发输出'
            },
            'Assassin': {
                strong: '单挑能力强，可以秒杀脆皮',
                weak: '团战容错率低，被控制就危险',
                combo: '等待关键技能交出后再进场，优先击杀C位'
            },
            'Marksman': {
                strong: '持续输出高，推塔能力强',
                weak: '身板脆，需要保护',
                combo: '团战时注意走位，优先攻击最近的敌人'
            },
            'Tank': {
                strong: '承伤能力强，开团能力强',
                weak: '伤害较低，容易被风筝',
                combo: '利用控制技能开团，保护己方C位'
            },
            'Support': {
                strong: '辅助能力强，能保护队友',
                weak: '经济较少，单挑能力弱',
                combo: '做好视野，关键时刻使用控制和治疗技能'
            }
        };

        return tips[role] || tips['Fighter'];
    }

    return {
        VERSION,
        TAG_MAP,
        getChampionList,
        getChampionDetail,
        getChampionIconUrl,
        getChampionSplashUrl,
        getSpellIconUrl,
        getPassiveIconUrl,
        getItemIconUrl,
        getRuneIconUrl,
        processChampionList,
        processChampionDetail,
        getRecommendedBuild,
        getCounterTips
    };
})();

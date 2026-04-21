const crypto = require('crypto');

const TRANSLIT = {
    а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z',
    и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r',
    с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch',
    ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
    ә: 'a', ғ: 'g', қ: 'k', ң: 'n', ө: 'o', ұ: 'u', ү: 'u', һ: 'h', і: 'i'
};

function slugify(input) {
    if (!input) return '';
    const lower = String(input).toLowerCase();
    let out = '';
    for (const ch of lower) {
        if (TRANSLIT[ch] !== undefined) {
            out += TRANSLIT[ch];
        } else if (/[a-z0-9]/.test(ch)) {
            out += ch;
        } else {
            out += '-';
        }
    }
    return out.replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
}

async function uniqueSlug(Model, desired, fallback) {
    const base = slugify(desired) || slugify(fallback) || 'item';
    let candidate = base;
    let n = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
        const existing = await Model.findOne({ where: { slug: candidate } });
        if (!existing) return candidate;
        n += 1;
        if (n > 15) {
            return `${base}-${crypto.randomBytes(3).toString('hex')}`;
        }
        candidate = `${base}-${n}`;
    }
}

module.exports = { slugify, uniqueSlug };

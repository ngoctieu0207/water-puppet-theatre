// Story mode: turns a short script (English or Vietnamese) into a performance.
//
// No AI service is involved: the text is split into clauses ("…, then …", "… but …", "… rồi …"),
// and each clause is scanned for character names and action words with a hand-made dictionary.
// Each clause becomes one scene. Actions become the same input bitmasks the keyboard produces
// (plus a few story-only acting moves), so the puppets move as if a puppeteer played them.
//
// Staging rules:
// - Characters start hidden under the water and rise the first time the story names them.
// - Before a "show" action (dance, greet, fight, love, scold…) the performers line up at
//   centre stage, side by side with room between them, and face whoever they are acting on.
// - "A holds hands with B" makes them a pair: following clauses without a name move both.
// - "A rides B" seats A on B's back; "flies to the sky" then carries both away.
import { BIT } from '../core/input.js';
import { HEIGHT, HAND_GAP, holdHands, releaseHands } from '../core/controller.js';

// ---------------------------------------------------------------- dictionary
// Each entry: [accented Vietnamese, unaccented Vietnamese, English]
const CHARACTERS = {
  boy: [['cậu bé', 'chú bé', 'bé trai', 'thằng bé', 'cu tí'], ['cau be', 'chu be', 'be trai', 'thang be', 'cu ti'], ['boy']],
  girl: [['cô bé', 'bé gái', 'em gái', 'cái tí'], ['co be', 'be gai', 'em gai'], ['girl']],
  elder: [['ông đồ', 'thầy đồ', 'ông lão', 'ông già', 'thầy giáo', 'thầy'], ['ong do', 'thay do', 'ong lao', 'ong gia', 'thay giao'], ['scholar', 'old man', 'elder', 'teacher']],
  dragon: [['rồng'], ['rong'], ['dragon']],
  phoenix: [['phượng hoàng', 'chim phượng', 'phượng'], ['phuong hoang', 'phuong'], ['phoenix']],
  turtle: [['rùa vàng', 'cụ rùa', 'rùa'], ['rua vang', 'cu rua', 'rua'], ['turtle', 'tortoise']],
};
// Words that name several characters at once
const GROUPS = [
  { ids: ['boy', 'girl'], entry: [['hai bạn nhỏ', 'hai bạn', 'hai bé', 'các em', 'bọn trẻ', 'lũ trẻ', 'hai đứa trẻ', 'hai đứa'], ['hai be', 'cac em', 'bon tre', 'lu tre', 'hai dua'], ['children', 'kids', 'the two kids', 'the couple']] },
];
const EVERYONE = [
  ['tất cả', 'mọi người', 'cả hai', 'cả ba', 'cả bốn', 'cả năm', 'cả sáu', 'cả bọn', 'cả nhóm', 'các bạn', 'cùng nhau'],
  ['tat ca', 'moi nguoi', 'ca hai', 'ca ba', 'ca bon', 'cung nhau', 'cac ban'],
  ['everyone', 'everybody', 'all of them', 'together', 'both', 'they all'],
];
// Pronouns that mean "the characters from before"
const THEY = [['họ', 'hai người', 'chúng'], ['ho', 'hai nguoi'], ['they', 'them', 'the two']];

// Order matters: specific phrases first; matched text is consumed.
const ACTIONS = [
  ['fly', ['bay về trời', 'bay lên trời', 'bay lên mây', 'bay vút', 'bay đi', 'bay mất', 'bay xa', 'lên trời', 'về trời'], ['bay ve troi', 'bay len troi', 'bay len may', 'bay di', 'len troi', 've troi'], ['flies away', 'fly away', 'flies up', 'fly up', 'flies off', 'into the sky', 'to the sky', 'to heaven', 'up to heaven', 'soars', 'takes off']],
  ['ride', ['cưỡi', 'leo lên lưng', 'ngồi lên lưng', 'trèo lên lưng', 'trèo lên'], ['leo len lung', 'ngoi len lung', 'treo len'], ['rides', 'ride', 'climbs onto', 'climbs on', 'gets on', 'mounts']],
  ['dismount', ['xuống khỏi', 'nhảy xuống khỏi', 'leo xuống', 'trèo xuống'], ['xuong khoi', 'leo xuong', 'treo xuong'], ['gets off', 'climbs down', 'jumps off', 'dismounts']],
  ['scold', ['không cho yêu', 'không cho', 'cấm', 'ngăn cản', 'ngăn', 'la mắng', 'mắng', 'phản đối', 'từ chối', 'nổi giận', 'giận', 'quát'], ['khong cho', 'ngan can', 'la mang', 'phan doi', 'tu choi', 'noi gian', 'quat'], ['forbids their love', 'forbid their love', 'forbids them', 'does not allow', "doesn't allow", 'forbids', 'forbid', 'refuses', 'refuse', 'scolds', 'scold', 'disapproves', 'says no', 'gets angry', 'is angry', 'angry', 'objects', 'stops them']],
  ['together', ['nắm tay nhau', 'dắt tay nhau', 'cầm tay nhau', 'nắm tay', 'dắt tay', 'cầm tay', 'tay trong tay', 'đi cùng', 'đi với', 'cùng với'], ['nam tay nhau', 'dat tay nhau', 'nam tay', 'dat tay', 'cam tay', 'di cung', 'di voi'], ['holds hands with', 'hold hands with', 'holding hands with', 'holds the hand of', 'takes the hand of', 'hold hands', 'holding hands', 'hand in hand', 'walks with', 'goes with', 'together with']],
  ['love', ['yêu nhau', 'yêu', 'thương', 'thích', 'ôm', 'hôn', 'tỏ tình'], ['yeu nhau', 'yeu', 'thuong', 'hon', 'to tinh'], ['love each other', 'falls in love', 'fall in love', 'in love', 'loves', 'love', 'hugs', 'hug', 'kisses', 'likes']],
  ['sad', ['buồn', 'khóc', 'đau lòng', 'thất vọng', 'tủi thân'], ['buon', 'khoc', 'dau long', 'that vong'], ['sad', 'cries', 'cry', 'weeps', 'upset', 'heartbroken']],
  ['laugh', ['cười', 'vui vẻ', 'vui mừng', 'hạnh phúc', 'reo hò'], ['vui ve', 'vui mung', 'hanh phuc', 'reo ho'], ['laughs', 'laugh', 'happy', 'cheers', 'smiles', 'joyful']],
  ['duel', ['tỉ thí', 'giao đấu', 'đánh nhau', 'so tài', 'thi tài', 'chiến đấu', 'đấu'], ['ti thi', 'giao dau', 'danh nhau', 'so tai', 'thi tai', 'chien dau'], ['fight', 'fights', 'battle', 'battles', 'duel', 'duels', 'compete', 'competes', 'contest']],
  ['perform', ['nhảy múa', 'múa', 'biểu diễn', 'trổ tài', 'té nước', 'tạt nước', 'tát nước', 'phun nước', 'viết chữ', 'cho chữ', 'dạy chữ'], ['nhay mua', 'bieu dien', 'te nuoc', 'tat nuoc', 'phun nuoc', 'viet chu', 'cho chu', 'day chu'], ['dance', 'dances', 'perform', 'performs', 'splash', 'splashes', 'spray', 'sprays', 'writes', 'calligraphy', 'teaches']],
  ['enter', ['xuất hiện', 'bước ra', 'đi ra', 'bay ra', 'bơi ra', 'ra sân khấu', 'ló ra', 'hiện ra'], ['xuat hien', 'buoc ra', 'di ra', 'bay ra', 'boi ra', 'hien ra'], ['appear', 'appears', 'enter', 'enters', 'come out', 'comes out', 'arrive', 'arrives']],
  ['exit', ['đi vào', 'rút lui', 'biến mất', 'tạm biệt', 'bơi vào', 'lui vào', 'ra về', 'đi về', 'bỏ đi'], ['di vao', 'rut lui', 'bien mat', 'tam biet', 'boi vao', 'ra ve', 'di ve', 'bo di'], ['exit', 'exits', 'leave', 'leaves', 'goodbye', 'disappear', 'disappears', 'go home', 'goes home', 'walks away']],
  ['rise', ['trồi lên', 'nổi lên', 'ngoi lên', 'hiện lên', 'nhô lên'], ['troi len', 'noi len', 'ngoi len', 'nho len'], ['rise', 'rises', 'surface', 'surfaces', 'emerge', 'emerges', 'pop up', 'pops up']],
  ['hide', ['trốn', 'ẩn mình', 'chìm xuống', 'núp'], ['tron', 'an minh', 'chim xuong', 'nup'], ['hide', 'hides', 'sink', 'sinks']],
  ['dive', ['lặn', 'ngụp'], ['lan xuong', 'ngup'], ['dive', 'dives', 'plunge', 'plunges']],
  ['approach', ['đi học', 'đến thăm', 'thăm', 'đến gặp', 'gặp', 'lại gần', 'đến gần', 'tới gần', 'bơi tới', 'bơi lại', 'chạy tới', 'đến chỗ', 'tới chỗ', 'tìm'], ['di hoc', 'den tham', 'den gap', 'lai gan', 'den gan', 'toi gan', 'boi toi', 'den cho', 'toi cho'], ['go to school', 'goes to school', 'study with', 'studies with', 'visits', 'visit', 'goes to see', 'go to see', 'goes to', 'swims to', 'swims over to', 'approaches', 'approach', 'goes over to', 'joins', 'meets', 'finds']],
  ['left', ['sang trái', 'qua trái', 'bên trái', 'phía trái', 'về trái'], ['sang trai', 'qua trai', 'ben trai', 've trai'], ['left']],
  ['right', ['sang phải', 'qua phải', 'bên phải', 'phía phải', 'về phải'], ['sang phai', 'qua phai', 'ben phai', 've phai'], ['right']],
  ['forward', ['tiến lên', 'ra phía trước', 'tiến ra', 'tiến tới'], ['tien len', 'tien ra', 'tien toi'], ['forward', 'closer', 'towards the audience']],
  ['back', ['lùi lại', 'lùi', 'ra phía sau'], ['lui lai'], ['backward', 'backwards', 'back away', 'backs away']],
  ['jump', ['nhảy', 'bật lên', 'tung mình', 'bay lên', 'vọt lên'], ['nhay', 'bat len', 'bay len', 'vot len'], ['jump', 'jumps', 'leap', 'leaps', 'hop', 'hops']],
  ['wave', ['vẫy', 'chào', 'cúi chào', 'gật đầu'], ['vay', 'chao', 'gat dau'], ['wave', 'waves', 'greet', 'greets', 'bow', 'bows', 'nod', 'nods', 'hello']],
  ['spin', ['xoay', 'quay tròn', 'quay', 'vòng tròn'], ['xoay', 'quay'], ['spin', 'spins', 'twirl', 'twirls', 'turn around', 'turns around']],
  ['swim', ['bơi', 'lướt', 'dạo', 'tắm', 'vòng quanh', 'đi dạo', 'bay lượn'], ['boi', 'luot', 'dao', 'tam'], ['swim', 'swims', 'glide', 'glides', 'paddle', 'paddles', 'bathe', 'bathes', 'wander', 'wanders']],
];

// Actions that need someone to act on; if the clause names nobody, it is the previous characters
const NEEDS_TARGET = new Set(['scold', 'love', 'together', 'approach', 'ride']);

// Music mood from the words of the story (first match wins)
const MOODS = [
  ['battle', ['tỉ thí', 'giao đấu', 'đánh', 'chiến', 'đấu', 'so tài', 'thi tài', 'ti thi', 'danh nhau', 'fight', 'battle', 'duel', 'contest', 'war', 'compete']],
  ['night', ['đêm', 'trăng', 'buồn', 'ngủ', 'khóc', 'không cho yêu', 'dem', 'trang', 'night', 'moon', 'sad', 'sleep', 'cry', 'quiet', 'forbid']],
  ['festival', ['hội', 'lễ', 'tết', 'vui', 'mừng', 'múa', 'hoi lang', 'le hoi', 'festival', 'celebrat', 'party', 'happy', 'dance', 'new year']],
];

export function detectMood(text) {
  const low = text.toLowerCase();
  for (const [mood, words] of MOODS) if (words.some((w) => low.includes(w))) return mood;
  return 'calm';
}

const VIET_MARKS = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;
const isLetter = (ch) => !!ch && /\p{L}/u.test(ch);
const NEGATION = /(không|chẳng|chưa|đừng|not|n't|never|no longer)\s*$/i;

/** All whole-word occurrences of phrase in text that are not already consumed. */
function find(text, phrase, used) {
  const hits = [];
  let i = text.indexOf(phrase);
  while (i !== -1) {
    const end = i + phrase.length;
    const free = !used.some(([a, b]) => i < b && end > a);
    if (free && !isLetter(text[i - 1]) && !isLetter(text[end])) hits.push([i, end]);
    i = text.indexOf(phrase, i + 1);
  }
  return hits;
}

function pick(entry, accented) {
  // Vietnamese with marks → accented list + English; without marks → also unaccented list.
  return accented ? [...entry[0], ...entry[2]] : [...entry[0], ...entry[1], ...entry[2]];
}

// Split into clauses at sentence ends, commas and linking words (then / but / rồi / nhưng …)
const CLAUSE_SPLIT = /(?<=[.!?…;])\s+|\n+|,\s*|\s+(?:rồi|nhưng|sau đó|thế là|bỗng|then|but|and then|after that|suddenly)\s+/i;

// ---------------------------------------------------------------- parse
export function parseStory(raw) {
  const text = raw.trim();
  const accented = VIET_MARKS.test(text);
  const clauses = text.split(CLAUSE_SPLIT).map((s) => (s || '').trim()).filter((s) => s && /\p{L}/u.test(s));
  const beats = [];
  for (const clause of clauses) {
    const low = clause.toLowerCase();
    const used = [];
    const found = [];
    for (const g of GROUPS) {
      for (const phrase of pick(g.entry, accented)) {
        for (const h of find(low, phrase, used)) { used.push(h); for (const id of g.ids) found.push({ id, at: h[0] }); }
      }
    }
    for (const [id, entry] of Object.entries(CHARACTERS)) {
      for (const phrase of pick(entry, accented).sort((a, b) => b.length - a.length)) {
        for (const h of find(low, phrase, used)) { used.push(h); found.push({ id, at: h[0] }); }
      }
    }
    const everyone = [];
    for (const phrase of pick(EVERYONE, accented)) for (const h of find(low, phrase, used)) { used.push(h); everyone.push(h[0]); }
    const they = [];
    for (const phrase of pick(THEY, accented)) for (const h of find(low, phrase, used)) { used.push(h); they.push(h[0]); }
    let acts = [];
    for (const [name, ...entry] of ACTIONS) {
      for (const phrase of pick(entry, accented).sort((a, b) => b.length - a.length)) {
        for (const h of find(low, phrase, used)) {
          used.push(h);
          // "không múa" / "doesn't dance": a negated action is not performed
          if (name !== 'scold' && NEGATION.test(low.slice(Math.max(0, h[0] - 10), h[0]))) continue;
          acts.push({ name, at: h[0] });
        }
      }
    }
    acts.sort((a, b) => a.at - b.at);
    acts = acts.filter((a, i, arr) => !i || a.name !== arr[i - 1].name);
    found.sort((a, b) => a.at - b.at);
    const firstAct = acts.length ? acts[0].at : Infinity;
    let subjects = [...new Set(found.filter((f) => f.at < firstAct).map((f) => f.id))];
    const all = everyone.some((at) => at < firstAct) || (everyone.length > 0 && !subjects.length);
    const pronoun = !subjects.length && they.some((at) => at < firstAct);
    // Each action's target: the first character named after it (before the next action)
    const targets = acts.map((a, i) => {
      const end = i + 1 < acts.length ? acts[i + 1].at : Infinity;
      return found.find((f) => f.at > a.at && f.at < end && !subjects.includes(f.id))?.id
        || found.find((f) => f.at > a.at && !subjects.includes(f.id))?.id || null;
    });
    if (!subjects.length && !all && !pronoun && found.length && !acts.length) subjects = [...new Set(found.map((f) => f.id))];
    beats.push({ text: clause, subjects, all, pronoun, actions: acts.map((a) => a.name), targets, mentioned: [...new Set(found.map((f) => f.id))] });
  }
  const cast = [];
  for (const b of beats) for (const id of [...b.subjects, ...b.mentioned]) if (!cast.includes(id)) cast.push(id);
  if (!cast.length) cast.push('boy', 'girl');
  // Resolve "everyone", pronouns, pairs and missing targets
  let last = [];
  let pair = null;
  for (const b of beats) {
    if (b.all) b.subjects = [...cast];
    else if (!b.subjects.length && (b.actions.length || b.pronoun)) b.subjects = pair ? [...pair] : last.length ? [...last] : [cast[0]];
    // A pair keeps moving together until someone else is named
    if (b.subjects.length && pair && !b.subjects.every((s) => pair.includes(s))) pair = null;
    b.audience = [];
    b.targets = b.targets.map((t, i) => {
      if (t || !NEEDS_TARGET.has(b.actions[i])) return t;
      // "the girl and the boy hold hands": they hold each other's hands
      if (b.actions[i] === 'together' && b.subjects.length >= 2) return null;
      // "the scholar forbids their love": acting on the characters from before
      const others = last.filter((s) => !b.subjects.includes(s));
      b.audience.push(...others);
      return others[0] || null;
    });
    const ti = b.actions.indexOf('together');
    if (ti >= 0 && b.targets[ti]) pair = [...new Set([...b.subjects, b.targets[ti]])];
    else if (ti >= 0 && b.subjects.length >= 2) pair = b.subjects.slice(0, 2);
    b.pair = pair && [...pair];
    if (b.subjects.length) last = pair ? [...pair] : b.subjects;
  }
  return { cast, beats, mood: detectMood(text) };
}

// ---------------------------------------------------------------- steps
const T = (s) => Math.max(1, Math.round(s * 60));
const hold = (mask, s) => ({ kind: 'hold', mask, ticks: T(s) });
const tap = (bit, wait) => [{ kind: 'hold', mask: bit, ticks: 2 }, hold(0, wait)];
const approach = (target, dist) => ({ kind: 'approach', target, dist, ticks: T(5) });
const face = (target) => ({ kind: 'face', target, ticks: T(2) });
const faceAudience = () => ({ kind: 'face', target: null, ticks: T(2) });
const SWIM = [[BIT.KeyD, 0.5], [BIT.KeyD | BIT.KeyS, 0.4], [BIT.KeyS, 0.4], [BIT.KeyA | BIT.KeyS, 0.4], [BIT.KeyA, 0.6],
  [BIT.KeyA | BIT.KeyW, 0.4], [BIT.KeyW, 0.4], [BIT.KeyD | BIT.KeyW, 0.4], [0, 0.4]];
const EMOTE_DUR = { scold: 2.6, sad: 3.0, love: 3.2, laugh: 2.4, fly: 4.4 };
const EMOTE_BIT = { scold: BIT.Scold, sad: BIT.Sad, love: BIT.Love, laugh: BIT.Laugh, fly: BIT.Fly };

function stepsFor(action, def, target) {
  const A = def.actions;
  switch (action) {
    case 'enter': return [hold(BIT.ArrowUp, 1.15), hold(BIT.KeyS, 0.8), hold(0, 0.3)];
    case 'rise': return [hold(BIT.ArrowUp, 1.15), hold(0, 0.3)];
    case 'hide': return [hold(BIT.ArrowDown, 1.6), hold(0, 0.3)];
    case 'exit': return [hold(BIT.KeyW, 1.1), hold(BIT.ArrowDown, 1.7)];
    case 'approach': return target ? [approach(target, 2.6), face(target)] : [hold(BIT.KeyS, 1.0)];
    case 'together': return [hold(0, 0.6)];   // standing side by side is done by the centre-stage row
    case 'left': return [hold(BIT.KeyA, 1.3), hold(0, 0.3)];
    case 'right': return [hold(BIT.KeyD, 1.3), hold(0, 0.3)];
    case 'forward': return [hold(BIT.KeyS, 1.0), hold(0, 0.3)];
    case 'back': return [hold(BIT.KeyW, 1.0), hold(0, 0.3)];
    case 'swim': return SWIM.map(([m, s]) => hold(m, s));
    case 'jump': return tap(BIT.Space, 1.15);
    case 'dive': return tap(BIT.KeyF, A.dive.duration + 0.2);
    case 'wave': return tap(BIT.KeyQ, A.wave.duration);
    case 'spin': return [hold(BIT.ArrowRight, 2.3), hold(0, 0.4)];
    case 'perform': return tap(BIT.KeyE, A.perform.duration + 0.2);
    case 'scold': case 'sad': case 'love': case 'laugh': case 'fly':
      return tap(EMOTE_BIT[action], EMOTE_DUR[action] + 0.2);
    case 'duel': return target
      ? [...tap(BIT.KeyQ, 1.2), ...tap(BIT.KeyE, A.perform.duration + 0.1), face(target), ...tap(BIT.Space, 1.2), hold(BIT.ArrowRight, 1.2)]
      : [...tap(BIT.KeyE, A.perform.duration + 0.1), ...tap(BIT.Space, 1.2)];
    default: return [];
  }
}

// "Shown" actions: whoever does them moves to centre stage first
const SHOW = new Set(['perform', 'wave', 'spin', 'jump', 'duel', 'scold', 'love', 'approach']);
// Actions that make a hand-holding pair let go first
const LETS_GO = new Set(['fly', 'ride', 'dive', 'hide', 'exit', 'duel', 'jump', 'spin']);
// Space between performers standing side by side at centre stage
const GAP = 2.8;
const DUEL_GAP = 3.4;
// A place in a centred row; the order is decided live from where everyone is, so nobody swims through someone else.
const slot = (group, gap) => ({ kind: 'slot', group, gap, ticks: T(5) });

export function buildStory(parsed, getDef) {
  const { cast, beats } = parsed;
  const visible = new Set();
  const riding = {};           // rider → mount
  let hands = null;            // { leader, follower } while two characters hold hands
  const scenes = [];
  const riderOf = (mount) => Object.keys(riding).find((r) => riding[r] === mount);

  for (const b of beats) {
    const perActor = {};
    const add = (id, steps) => { (perActor[id] ||= []).push(...steps); };
    const ensureVisible = (id) => {
      if (!visible.has(id)) { add(id, stepsFor('rise', getDef(id))); visible.add(id); }
    };
    // Let go of hands when the story moves on to something the pair doesn't do together
    if (hands) {
      const both = b.subjects.includes(hands.leader) && b.subjects.includes(hands.follower);
      const solo = b.subjects.length && (b.subjects.includes(hands.leader) || b.subjects.includes(hands.follower)) && !both;
      if (solo || b.actions.some((a) => LETS_GO.has(a)) && (b.subjects.includes(hands.leader) || b.subjects.includes(hands.follower))) {
        add(hands.leader, [{ kind: 'release', ticks: 2 }, hold(0, 0.3)]);
        hands = null;
      }
    }
    const duel = b.actions.includes('duel');
    const firstTarget = b.targets.find((t, i) => t && b.actions[i] !== 'ride') || null;
    const shows = b.actions.some((a) => SHOW.has(a));
    // People who line up at centre stage: the actors and whoever they act on
    const group = shows ? [...new Set([...b.subjects, ...b.targets.filter((t, i) => t && b.actions[i] !== 'ride'), ...(b.audience || [])])].filter((id) => !riding[id] && (visible.has(id) || b.subjects.includes(id) || b.targets.includes(id))) : [];
    const gap = duel ? DUEL_GAP : GAP;

    for (const id of b.subjects) {
      const def = getDef(id);
      const acts = b.actions.slice();
      const tgts = b.targets.slice();
      if (!visible.has(id) && acts[0] !== 'enter' && acts[0] !== 'rise' && !riding[id]) { acts.unshift('rise'); tgts.unshift(null); }
      visible.add(id);
      const steps = [];
      let placed = false;
      acts.forEach((a, i) => {
        let target = tgts[i] && tgts[i] !== id ? tgts[i] : null;
        if (duel && !target) target = b.subjects.find((s) => s !== id) || null;
        // A rider who "flies" or "swims" makes the mount do it
        if (riding[id] && (a === 'fly' || a === 'swim' || a === 'dive' || a === 'jump' || a === 'left' || a === 'right' || a === 'exit')) {
          const m = riding[id];
          // the mount waits until its rider is actually sitting on its back
          add(m, [{ kind: 'waitRider', rider: id, ticks: T(8) }, ...stepsFor(a, getDef(m), null)]);
          if (a === 'fly' || a === 'exit') { visible.delete(m); visible.delete(id); }
          steps.push(hold(0, 0.2));
          return;
        }
        if (a === 'ride' && target && getDef(target).seat && !riderOf(target)) {
          ensureVisible(target);
          steps.push(approach(target, 0.9), { kind: 'mount', target, ticks: 2 }, hold(0, 0.6));
          riding[id] = target;
          return;
        }
        if (a === 'dismount' && riding[id]) {
          steps.push({ kind: 'dismount', ticks: 2 }, hold(BIT.KeyS, 0.7), hold(0, 0.3));
          delete riding[id];
          return;
        }
        if (a === 'together') {
          // Leader walks up to the partner and takes their hand; the partner waits for it
          const partner = target || (b.subjects.length >= 2 && b.subjects[0] === id ? b.subjects[1] : null);
          if (partner && !hands) {
            ensureVisible(partner);
            steps.push(approach(partner, HAND_GAP + 0.15), { kind: 'handhold', partner, ticks: 2 }, faceAudience(), hold(0, 0.6));
            if (!b.subjects.includes(partner)) add(partner, [face(id)]);
            hands = { leader: id, follower: partner };
          } else if (hands && hands.follower === id) {
            steps.push({ kind: 'waitHand', ticks: T(7) });
          }
          return;
        }
        if (target) ensureVisible(target);
        if (shows && !placed && group.includes(id) && SHOW.has(a)) {
          const facing = target || (duel ? b.subjects.find((s) => s !== id) : null) || firstTarget;
          steps.push(slot(group, gap), facing && facing !== id ? face(facing) : faceAudience());
          placed = true;
        }
        if (a === 'approach') return; // the centre-stage row already brought them together
        steps.push(...stepsFor(a, def, target));
        if (a === 'fly' || a === 'exit' || (a === 'hide' && i === acts.length - 1)) visible.delete(id);
      });
      if (placed && firstTarget && visible.has(id)) steps.push(hold(0, 0.3), faceAudience());
      add(id, steps);
    }
    // Those being acted on join the row and turn towards the actor
    for (const id of group) {
      if (b.subjects.includes(id)) continue;
      ensureVisible(id);
      add(id, [slot(group, gap), face(b.subjects[0]), hold(0, 1.2)]);
    }
    scenes.push({ text: b.text, perActor, minTicks: T(b.actions.length ? 1.0 : 2.0) });
  }
  // Home positions: spread out, starting hidden under the water
  const homes = {};
  const n = cast.length;
  const span = Math.min(13, 3.2 * (n - 1));
  cast.forEach((id, i) => {
    const x = n === 1 ? 0 : -span / 2 + (span * i) / (n - 1);
    homes[id] = { x, z: i % 2 ? 0.2 : 1.4, height: HEIGHT.MIN };
  });
  return { cast, scenes, homes, mood: parsed.mood };
}

/** Plays the scenes: feeds each puppet one input mask per tick, steering live where needed. */
export class StoryRunner {
  constructor(story) {
    this.story = story;
    this.scene = -1;
    this.done = false;
    this.tail = T(1.5);
    this.next();
  }

  next() {
    this.scene++;
    if (this.scene >= this.story.scenes.length) { this.finishing = true; return; }
    const s = this.story.scenes[this.scene];
    this.queues = Object.fromEntries(Object.entries(s.perActor).map(([id, steps]) => [id, steps.map((x) => ({ ...x }))]));
    this.sceneTicks = 0;
    this.slots = null;
  }

  /** controllers: { id: PuppetController }. Returns { id: mask }. */
  tick(controllers) {
    const masks = {};
    if (this.finishing) {
      if (--this.tail <= 0) this.done = true;
      return masks;
    }
    let busy = false;
    for (const [id, queue] of Object.entries(this.queues)) {
      const c = controllers[id];
      while (queue.length) {
        const step = queue[0];
        const m = c ? this.evaluate(step, c, controllers, id) : null;
        step.ticks--;
        if (m === null || step.ticks < 0) { queue.shift(); continue; }
        masks[id] = m;
        busy = true;
        break;
      }
    }
    this.sceneTicks++;
    if (!busy && this.sceneTicks >= this.story.scenes[this.scene].minTicks) this.next();
    return masks;
  }

  /** Steer towards a point; null once close enough (letting go early to allow for the glide). */
  steer(c, x, z, dist, tvx = 0, tvz = 0, avoid = [], target = null) {
    const dx = x - c.x, dz = z - c.z;
    const d = Math.hypot(dx, dz);
    // On water a puppet keeps gliding after the push stops (about speed / 3.2 metres)
    const closing = d > 0 ? ((c.vx - tvx) * dx + (c.vz - tvz) * dz) / d : 0;
    if (d - Math.max(0, closing) / 3.2 <= dist) return null;
    // Head for the goal, but swerve around anyone standing in the way
    let ux = dx / d, uz = dz / d;
    for (const o of avoid) {
      if (o === c || o === target || o.submerged || o.mount === c || c.mount === o || o.handOf === c || c.holding === o) continue;
      const ox = c.x - o.x, oz = c.z - o.z;
      const od = Math.hypot(ox, oz);
      if (od < 2.0 && od > 1e-3) {
        const push = ((2.0 - od) / 2.0) * 2.2;
        // push away, plus a sideways nudge so we go round instead of stopping
        ux += (ox / od) * push + (-uz) * push * 0.6;
        uz += (oz / od) * push + (ux) * push * 0.6;
      }
    }
    const ul = Math.hypot(ux, uz) || 1;
    ux /= ul; uz /= ul;
    let m = 0;
    if (ux > 0.38) m |= BIT.KeyD; else if (ux < -0.38) m |= BIT.KeyA;
    if (uz > 0.38) m |= BIT.KeyS; else if (uz < -0.38) m |= BIT.KeyW;
    return m;
  }

  /** Mask for one tick of a step, or null when the step is finished. */
  evaluate(step, c, controllers, id) {
    if (step.kind === 'hold') return step.ticks > 0 ? step.mask : null;
    if (step.kind === 'handhold') {
      const p = controllers[step.partner];
      if (p) holdHands(c, p);
      return null;
    }
    if (step.kind === 'release') { releaseHands(c); return null; }
    if (step.kind === 'waitHand') return c.handOf ? null : 0;
    // A puppet being led by the hand goes wherever its partner goes
    if (c.handOf && (step.kind === 'slot' || step.kind === 'face' || step.kind === 'approach')) return null;
    if (step.kind === 'waitRider') {
      const r = controllers[step.rider];
      return r && r.mount !== c ? 0 : null;
    }
    if (step.kind === 'mount') {
      const m = controllers[step.target];
      if (m) c.mount = m;
      return null;
    }
    if (step.kind === 'dismount') {
      c.mount = null;
      c.targetHeight = c.height = -0.35;
      return null;
    }
    if (step.kind === 'slot') {
      if (!this.slots) {
        // Centred row, ordered left to right by where everyone is now
        // (a puppet led by the hand takes no place of its own: its partner's place is wider instead)
        const ids = step.group.filter((g) => controllers[g] && !controllers[g].handOf).sort((a, b) => controllers[a].x - controllers[b].x);
        const k = ids.length;
        const gap = k > 1 ? Math.min(step.gap, 14 / (k - 1)) : 0;
        const widths = ids.map((g) => (controllers[g].holding ? HAND_GAP : 0));
        const total = widths.reduce((s, w) => s + w, 0) + gap * (k - 1);
        let cursor = -total / 2;
        const xs = ids.map((g, i) => { const x = cursor; cursor += widths[i] + gap; return x; });
        // Keep clear of anyone else already standing on stage: slide the row sideways if needed
        const others = Object.entries(controllers)
          .filter(([oid, oc]) => !ids.includes(oid) && !oc.submerged && !oc.mount && !oc.handOf && Math.abs(oc.z - 1.0) < 2.5)
          .map(([, oc]) => oc.x);
        let shift = 0;
        for (const s of [0, 2.8, -2.8, 5.6, -5.6, 8.4, -8.4]) {
          const fits = xs.every((x) => Math.abs(x + s) <= 8.5 && others.every((ox) => Math.abs(ox - (x + s)) > 2.2));
          if (fits) { shift = s; break; }
        }
        this.slots = Object.fromEntries(ids.map((g, i) => [g, { x: xs[i] + shift, z: 1.0 }]));
      }
      const s = this.slots[id];
      return s ? this.steer(c, s.x, s.z, 0.3, 0, 0, Object.values(controllers)) : null;
    }
    // A pair holding hands stays side by side facing the audience (turning would swing the partner round)
    const t = step.target && !(step.kind === 'face' && c.holding) ? controllers[step.target] : null;
    if (step.kind === 'approach') {
      if (!t) return null;
      return this.steer(c, t.x, t.z, step.dist, t.vx, t.vz, Object.values(controllers), t);
    }
    if (step.kind === 'face') {
      // forward is (sin yaw, cos yaw); facing the audience is yaw 0
      const want = t ? Math.atan2(t.x - c.x, t.z - c.z) : 0;
      let diff = want - c.yaw;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      if (Math.abs(diff) < 0.12 && Math.abs(c.yawVel) < 0.6) return null;
      if (Math.abs(diff) < 0.12) return 0;
      return diff > 0 ? BIT.ArrowLeft : BIT.ArrowRight;
    }
    return null;
  }
}

export const EXAMPLES = [
  {
    title: 'The Forbidden Love',
    text: 'The girl holds hands with the boy, then they go to study with the scholar. But the scholar forbids their love. The girl cries. Then the boy rides the dragon and flies to the sky.',
  },
  {
    title: 'Contest of the Sacred Four',
    text: 'The dragon appears. The phoenix appears and dances. The dragon and the phoenix fight! The dragon sprays the phoenix. The phoenix spins and jumps. The turtle rises and greets the dragon. Everyone bows.',
  },
  {
    title: 'Noon at the Village Pond',
    text: 'The boy appears and swims around. The girl appears and waves. The girl splashes the boy! The boy dives to hide. The boy pops up and splashes the girl. The scholar appears and greets the children. Everyone laughs.',
  },
  {
    title: 'Chuyện tình bên ao (Tiếng Việt)',
    text: 'Cô bé nắm tay cậu bé rồi đi học ông đồ nhưng bị ông đồ không cho yêu, cô bé khóc, rồi cậu bé cưỡi rồng bay về trời.',
  },
  {
    title: 'Moonlit Night',
    text: 'On a quiet night under the moon, the turtle rises. The girl appears and swims to the turtle. The girl greets the turtle. The turtle spins slowly. They both dive and disappear.',
  },
];

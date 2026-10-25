import type { Word, UserWord } from './types';
export type VocabularyFilter = 'all' | 'due' | 'weak' | 'stable';
export function vocabularyRows(words: Word[], states: UserWord[]) {
 const byId = new Map(words.map(w=>[w.id,w]));
 return states.filter(s=>s.state!=='new'&&s.reps>0&&byId.has(s.word_id)).map(state=>({word:byId.get(state.word_id)!,state})).sort((a,b)=>Date.parse(a.state.due)-Date.parse(b.state.due)||a.word.id-b.word.id);
}

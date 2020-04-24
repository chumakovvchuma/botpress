import _ from 'lodash'

import { computeNorm, cosineSimilarity, scalarDivide, vectorAdd, zeroes } from '../tools/math'
import Utterance, { UtteranceToken } from '../utterance/utterance'

function shouldConsiterToken(token: UtteranceToken): boolean {
  const isSysOrPatternEntity = token.entities.some(
    en => en.metadata.extractor === 'pattern' || en.metadata.extractor === 'system'
  )
  return token.isWord && !isSysOrPatternEntity
}

function getLexiconDistanceVec(utt: Utterance, lexiconVecs: number[][]): number[] {
  return lexiconVecs.map(vec => {
    const allSim = utt.tokens.map(t => cosineSimilarity(<number[]>t.vector, vec)).filter(n => n !== NaN && n >= 0)
    return Math.max(...allSim)
  })
}

export function getSentenceEmbeddingForCtx(utt: Utterance, lexiconVecs: number[][]): number[] {
  const lexiFeats = getLexiconDistanceVec(utt, lexiconVecs)
  const toks = utt.tokens.filter(shouldConsiterToken)
  if (_.isEmpty(toks)) {
    return zeroes(utt.tokens[0].vector.length + lexiconVecs.length)
  }

  const totalWeight = toks.reduce((sum, t) => sum + Math.min(1, t.tfidf), 0) || 1
  const weightedSum = toks.reduce((sum, t) => {
    const norm = computeNorm(<number[]>t.vector)
    const weightedVec = scalarDivide(<number[]>t.vector, norm / Math.min(1, t.tfidf))
    return vectorAdd(sum, weightedVec)
  }, zeroes(utt.tokens[0].vector.length))

  const stentenceEmbedding = scalarDivide(weightedSum, totalWeight)
  const features = [...stentenceEmbedding, ...lexiFeats]

  return features
}

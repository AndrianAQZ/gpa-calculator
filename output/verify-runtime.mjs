// Live runtime verification of name filter
const isInappropriateName = (name) => {
  const lowerName = name.toLowerCase().trim()
  const filtered = ['fuck', 'shit', 'cunt', 'nigger', 'nazi', 'hitler', 'kkk', 'pussy', 'whore', 'slut', 'bitch', 'bastard', 'faggot', 'penis', 'vagina', 'porn', 'rape']
  const tokens = lowerName.split(/[^a-z]+/).filter(Boolean)
  if (filtered.some(word => tokens.includes(word))) return true
  const specialCharCount = (lowerName.match(/[^a-z\s\-']/g) || []).length
  return specialCharCount > 4 || lowerName.replace(/\s/g, '').length < 2 || /(.)\1{5,}/.test(lowerName)
}

const tests = [
  // Task 4 done conditions
  ['Yassin', false, 'T4 DONE: Yassin accepted'],
  // Profanity still blocked
  ['fuck', true, 'T4: fuck blocked'],
  ['shit', true, 'T4: shit blocked'],
  ['cunt', true, 'T4: cunt blocked'],
  ['nigger', true, 'T4: nigger blocked'],
  ['nazi', true, 'T4: nazi blocked'],
  ['hitler', true, 'T4: hitler blocked'],
  ['kkk', true, 'T4: kkk blocked'],
  ['pussy', true, 'T4: pussy blocked'],
  ['whore', true, 'T4: whore blocked'],
  ['slut', true, 'T4: slut blocked'],
  ['bitch', true, 'T4: bitch blocked'],
  ['bastard', true, 'T4: bastard blocked'],
  ['faggot', true, 'T4: faggot blocked'],
  ['penis', true, 'T4: penis blocked'],
  ['vagina', true, 'T4: vagina blocked'],
  ['porn', true, 'T4: porn blocked'],
  ['rape', true, 'T4: rape blocked'],
  // Names that contain substrings (should pass)
  ['Alex', false, 'T4: Alex accepted'],
  ['Bass', false, 'T4: Bass accepted (was a false positive before)'],
  ['Class', false, 'T4: Class accepted (was a false positive before)'],
  ['Massachusetts', false, 'T4: Massachusetts accepted (was a false positive before)'],
  // Edge cases
  ['', true, 'T4: empty name rejected'],
  ['A', true, 'T4: 1 char rejected'],
  ['AAAAAAA', true, 'T4: repeated chars rejected'],
]

let passed = 0, failed = 0
for (const [name, expected, desc] of tests) {
  const actual = isInappropriateName(name)
  const ok = actual === expected
  if (ok) passed++
  else failed++
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${desc} -> isInappropriateName('${name}') = ${actual} (expected ${expected})`)
}
console.log(`\nFilter: ${passed} passed, ${failed} failed`)
process.exit(failed > 0 ? 1 : 0)

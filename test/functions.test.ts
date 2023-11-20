import { say } from '../src/functions'
describe('test',
  () => {
    it('say',
      () => {
        expect(say('hi')).toEqual('hi')
     }
    )
  }
)

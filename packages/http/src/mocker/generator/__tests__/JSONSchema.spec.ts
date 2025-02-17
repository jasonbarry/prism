import { get } from 'lodash';
import { JSONSchema } from '../../../types';
import { generate } from '../JSONSchema';
import { assertRight, assertLeft } from '@stoplight/prism-core/src/__tests__/utils';

describe('JSONSchema generator', () => {
  const ipRegExp = /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/;
  const emailRegExp = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  const uuidRegExp = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/;

  describe('generate()', () => {
    describe('when used with a schema with a simple string property', () => {
      const schema: JSONSchema = {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 1 },
        },
        required: ['name'],
      };

      it('will have a string property not matching anything in particular', () => {
        assertRight(generate({}, schema), instance => {
          expect(instance).toHaveProperty('name');
          const name = get(instance, 'name');

          expect(ipRegExp.test(name)).toBeFalsy();
          expect(emailRegExp.test(name)).toBeFalsy();
        });
      });
    });

    describe('when used with a schema with a string and email as format', () => {
      const schema: JSONSchema = {
        type: 'object',
        properties: {
          email: { type: 'string', format: 'email' },
        },
        required: ['email'],
      };

      it('will have a string property matching the email regex', () => {
        assertRight(generate({}, schema), instance => {
          expect(instance).toHaveProperty('email');
          const email = get(instance, 'email');

          expect(ipRegExp.test(email)).toBeFalsy();
          expect(emailRegExp.test(email)).toBeTruthy();
        });
      });
    });

    describe('when used with a schema with a string and uuid as format', () => {
      const schema: JSONSchema = {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
        required: ['id'],
      };

      it('will have a string property matching uuid regex', () => {
        assertRight(generate({}, schema), instance => {
          const id = get(instance, 'id');
          expect(id).toMatch(uuidRegExp);
        });
      });

      it('will not be presented in the form of UUID as a URN', () => {
        assertRight(generate({}, schema), instance => {
          const id = get(instance, 'id');
          expect(uuidRegExp.test(id)).not.toContainEqual('urn:uuid');
        });
      });
    });

    describe('when used with a schema with a string property and x-faker property', () => {
      const schema: JSONSchema & any = {
        type: 'object',
        properties: {
          ip: { type: 'string', format: 'ip', 'x-faker': 'internet.ip' },
        },
        required: ['ip'],
      };

      it('will have a string property matching the ip regex', () => {
        assertRight(generate({}, schema), instance => {
          expect(instance).toHaveProperty('ip');
          const ip = get(instance, 'ip');

          expect(ipRegExp.test(ip)).toBeTruthy();
          expect(emailRegExp.test(ip)).toBeFalsy();
        });
      });
    });

    describe('when faker is configured per-property', () => {
      it('with named parameters', () => {
        const schema: JSONSchema & any = {
          type: 'object',
          properties: {
            meaning: {
              type: 'number',
              'x-faker': {
                'random.number': {
                  min: 42,
                  max: 42,
                },
              },
            },
          },
          required: ['meaning'],
        };

        assertRight(generate({}, schema), instance => {
          expect(instance).toHaveProperty('meaning');
          const actual = get(instance, 'meaning');
          expect(actual).toStrictEqual(42);
        });
      });

      it('with positional parameters', () => {
        const schema: JSONSchema & any = {
          type: 'object',
          properties: {
            slug: {
              type: 'string',
              'x-faker': {
                'helpers.slugify': ['two words'],
              },
            },
          },
          required: ['slug'],
        };

        assertRight(generate({}, schema), instance => {
          expect(instance).toHaveProperty('slug');
          const actual = get(instance, 'slug');
          expect(actual).toStrictEqual('two-words');
        });
      });
    });

    describe('when used with a schema that is not valid', () => {
      const schema: JSONSchema = {
        type: 'object',
        properties: {
          _embedded: {
            $ref: '#/definitions/supermodelIoAdidasApiHAL',
          },
        },
      };

      it('will return a left', () => assertLeft(generate({}, schema)));
    });

    describe('when writeOnly properties are provided', () => {
      const schema: JSONSchema = {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string', writeOnly: true },
        },
        required: ['id', 'title'],
      };

      it('removes writeOnly properties', () => {
        assertRight(generate({}, schema), instance => {
          expect(instance).toEqual({
            id: expect.any(String),
          });
        });
      });
    });

    it('operates on sealed schema objects', () => {
      const schema: JSONSchema = {
        type: 'object',
        properties: {
          name: { type: 'string' },
        },
        required: ['name'],
      };

      Object.defineProperty(schema.properties, 'name', { writable: false });

      return expect(generate({}, schema)).toBeTruthy();
    });
  });
});

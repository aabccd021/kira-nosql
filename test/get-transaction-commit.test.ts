import {
  CreationTimeField,
  DocSnapshot,
  IncrementField,
  NumberField,
  RefField,
  RefUpdateField,
  StringField,
} from 'kira-core';
import { isSome, optionFromNullable, Right, Some } from 'trimop';

import {
  ActionTrigger,
  ColTrigger,
  getTransactionCommit,
  getTrigger,
  UpdateDocCommit,
} from '../src';
import { GetDocParam, GetDocReturn, testBuildDraft } from './util';

describe('getTransactionCommit', () => {
  const trigger = getTrigger({
    buildDraft: testBuildDraft,
    spec: {
      article: {
        author: {
          _type: 'Ref',
          isOwner: true,
          refedCol: 'user',
          syncedFields: {
            displayName: true,
          },
          thisColRefers: [],
        },
        bookmarkCount: {
          _type: 'Count',
          countedCol: 'bookmark',
          groupByRef: 'bookmarkedArticle',
        },
        creationTime: {
          _type: 'CreationTime',
        },
        title: {
          _type: 'String',
        },
      },
      bookmark: {
        bookmarkedArticle: {
          _type: 'Ref',
          isOwner: false,
          refedCol: 'article',
          syncedFields: {
            title: true,
          },
          thisColRefers: [],
        },
        bookmarkedTime: {
          _type: 'CreationTime',
        },
      },
      user: {
        displayName: {
          _type: 'String',
        },
      },
    },
  });

  const articleTrigger = optionFromNullable(trigger['article']) as Some<ColTrigger>;
  const bookmarkTrigger = optionFromNullable(trigger['bookmark']) as Some<ColTrigger>;

  it('article trigger is Some', () => {
    expect(isSome(articleTrigger)).toStrictEqual(true);
    expect(isSome(bookmarkTrigger)).toStrictEqual(true);
  });

  describe('onCreate', () => {
    const onCreateArticleTrigger = articleTrigger.value.onCreate as Some<
      ActionTrigger<DocSnapshot>
    >;
    const onCreateBookmarkTrigger = bookmarkTrigger.value.onCreate as Some<
      ActionTrigger<DocSnapshot>
    >;

    it('trigger is Some', () => {
      expect(isSome(onCreateArticleTrigger)).toStrictEqual(true);
    });

    describe('getTransactionCommit', () => {
      it('create creationTime and bookmarCount field when article created', async () => {
        const mockedGetDoc = jest.fn<GetDocReturn, GetDocParam>().mockResolvedValueOnce(
          Right({
            displayName: StringField('Kira'),
          })
        );
        const onCreateArticleTC = await getTransactionCommit({
          actionTrigger: onCreateArticleTrigger.value,
          getDoc: mockedGetDoc,
          snapshot: {
            doc: {
              author: RefField({
                doc: {},
                id: 'user-kira',
              }),
            },
            id: 'article0',
          },
        });
        expect(mockedGetDoc).toHaveBeenCalledTimes(1);
        expect(mockedGetDoc).toHaveBeenCalledWith({ col: 'user', id: 'user-kira' });
        expect(onCreateArticleTC).toStrictEqual(
          Right({
            article: {
              article0: UpdateDocCommit({
                onDocAbsent: 'doNotUpdate',
                writeDoc: {
                  author: {
                    _type: 'RefUpdate',
                    doc: {
                      displayName: {
                        _type: 'String',
                        value: 'Kira',
                      },
                    },
                  },
                  bookmarkCount: NumberField(0),
                  creationTime: CreationTimeField(),
                },
              }),
            },
          })
        );
      });

      it('create field when bookmark created', async () => {
        const mockedGetDoc = jest.fn<GetDocReturn, GetDocParam>().mockResolvedValueOnce(
          Right({
            title: StringField('Kaimei'),
          })
        );
        const onCreateBookmarkTC = await getTransactionCommit({
          actionTrigger: onCreateBookmarkTrigger.value,
          getDoc: mockedGetDoc,
          snapshot: {
            doc: {
              bookmarkedArticle: RefField({
                doc: {},
                id: 'article46',
              }),
            },
            id: 'bookmark0',
          },
        });
        expect(mockedGetDoc).toHaveBeenCalledTimes(1);
        expect(mockedGetDoc).toHaveBeenCalledWith({ col: 'article', id: 'article46' });
        expect(onCreateBookmarkTC).toStrictEqual(
          Right({
            article: {
              article46: UpdateDocCommit({
                onDocAbsent: 'doNotUpdate',
                writeDoc: {
                  bookmarkCount: IncrementField(1),
                },
              }),
            },
            bookmark: {
              bookmark0: UpdateDocCommit({
                onDocAbsent: 'doNotUpdate',
                writeDoc: {
                  bookmarkedArticle: RefUpdateField({
                    title: StringField('Kaimei'),
                  }),
                  bookmarkedTime: CreationTimeField(),
                },
              }),
            },
          })
        );
      });
    });
  });
});

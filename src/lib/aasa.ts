// Apple App Site Association payload, served at
// /.well-known/apple-app-site-association (see the rewrite in next.config.ts).
//
// Keep `components` in step with InviteTokenParser in the iOS app and with
// Docs/apple-app-site-association.json in the homeos repository.
//   webcredentials: Password AutoFill for cuppi.co.uk credentials.
//   applinks:       invite universal links, /invite/<token> and /invite?token=<token>.
// cuppi.co.uk is the only invite host; there is no homeos.app domain (BL-076).
export const APP_ID = 'H678YC85GW.JCW.HomeOS';

export const aasa = {
  applinks: {
    details: [
      {
        appIDs: [APP_ID],
        components: [
          { '/': '/invite/*', comment: 'Path-style invite link: /invite/<token>' },
          { '/': '/invite', '?': { token: '*' }, comment: 'Query-style invite link: /invite?token=<token>' },
        ],
      },
    ],
  },
  webcredentials: {
    apps: [APP_ID],
  },
};

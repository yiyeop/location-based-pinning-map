import Document, { Html, Head, Main, NextScript } from 'next/document';

const NCP_CLIENT_ID = process.env.NEXT_PUBLIC_NCP_CLIENT_ID;

export default class MyDocument extends Document {
  render() {
    return (
      <Html lang='ko-kr'>
        <Head>
          <script
            type='text/javascript'
            src={`https://openapi.map.naver.com/openapi/v3/maps.js?ncpClientId=${NCP_CLIENT_ID}&submodules=geocoder`}
          ></script>
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}

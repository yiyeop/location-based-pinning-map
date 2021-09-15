import { css } from '@emotion/react';
import Head from 'next/head';
import tw from 'twin.macro';
import MainMapContainer from 'templates/Main/MainMapContainer';

export default function Home() {
  return (
    <div
      css={css`
        height: 100vh;
      `}
    >
      <Head>
        <title>location-based-pinning-map</title>
        <link rel='icon' href='/favicon.ico' />
      </Head>
      <main css={tw`h-full`}>
        <MainMapContainer />
      </main>
    </div>
  );
}

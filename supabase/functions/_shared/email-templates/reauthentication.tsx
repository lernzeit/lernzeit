/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="de" dir="ltr">
    <Head />
    <Preview>Dein Bestätigungscode – Lernzeit 🔐</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Text style={logo}>🎓 Lernzeit</Text>
        </Section>
        <Heading style={h1}>Bestätigungscode 🔐</Heading>
        <Text style={text}>
          Verwende den folgenden Code, um deine Identität zu bestätigen:
        </Text>
        <Text style={codeStyle}>{token}</Text>
        <Text style={hint}>
          Der Code ist nur kurze Zeit gültig.
        </Text>
        <Text style={footer}>
          Falls du diesen Code nicht angefordert hast, kannst du diese E-Mail einfach ignorieren.
        </Text>
        <Text style={footerBrand}>
          © Lernzeit – Gemeinsam schlauer werden 💪
        </Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

const main = {
  backgroundColor: '#f8f9ff',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
}
const container = { maxWidth: '480px', margin: '0 auto', padding: '40px 24px' }
const header = { textAlign: 'center' as const, marginBottom: '24px' }
const logo = { fontSize: '28px', fontWeight: 'bold' as const, color: 'hsl(217, 91%, 60%)', margin: '0' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: 'hsl(240, 10%, 15%)', margin: '0 0 16px', textAlign: 'center' as const }
const text = { fontSize: '15px', color: 'hsl(240, 5%, 35%)', lineHeight: '1.6', margin: '0 0 16px' }
const codeStyle = {
  fontFamily: 'Courier, monospace',
  fontSize: '32px',
  fontWeight: 'bold' as const,
  color: 'hsl(217, 91%, 60%)',
  margin: '0 0 16px',
  textAlign: 'center' as const,
  letterSpacing: '6px',
}
const hint = { fontSize: '13px', color: 'hsl(240, 5%, 55%)', lineHeight: '1.5', margin: '0 0 24px', textAlign: 'center' as const }
const footer = { fontSize: '12px', color: 'hsl(240, 5%, 60%)', margin: '24px 0 8px', borderTop: '1px solid hsl(240, 20%, 92%)', paddingTop: '16px' }
const footerBrand = { fontSize: '12px', color: 'hsl(217, 91%, 60%)', margin: '0', fontWeight: '500' as const }

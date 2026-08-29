import type { Meta, StoryObj } from '@storybook/angular';
import { Button } from './button';

const meta: Meta<Button> = {
  title: 'Design System/Button',
  component: Button,
  args: {
    variant: 'primary',
    size: 'md',
    loading: false,
    disabled: false,
  },
  render: (args) => ({
    props: args,
    template: `<button dtvButton [variant]="variant" [size]="size" [loading]="loading" [disabled]="disabled">Guardar</button>`,
  }),
};

export default meta;
type Story = StoryObj<Button>;

export const Primary: Story = {};
export const Secondary: Story = { args: { variant: 'secondary' } };
export const Ghost: Story = { args: { variant: 'ghost' } };
export const Danger: Story = { args: { variant: 'danger' } };
export const Loading: Story = { args: { loading: true } };

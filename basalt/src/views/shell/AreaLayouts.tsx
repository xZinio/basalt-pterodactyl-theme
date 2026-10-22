import { useContext, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@pterodactyl/sdk';
import { Main, View, type ViewProps } from '@pterodactyl/sdk/theme';
import { primaryAddress, stateFill } from '../../lib/server';
import { PowerPlacement, SidebarServerSlot } from './context';

/** The shell draws every area's navigation, so the account and admin layouts only place their pages. */
export function AreaLayout({ children }: { children?: ReactNode }) {
    return <Main>{children}</Main>;
}

/** The server's name, address and power buttons, at the top of the sidebar. */
function ServerBlock({ model }: { model: ViewProps<'layout.server'>['model'] }) {
    const address = primaryAddress(model.server);

    return (
        <div className='surface relative py-4 pr-6 pl-4'>
            <p className='truncate text-base leading-[22px] font-semibold text-foreground'>{model.name}</p>
            {address && (
                <p className='mt-0.5 truncate text-[13px] leading-[1.375] text-muted-foreground' data-sensitive>
                    {address}
                </p>
            )}
            {model.conflict === null && (
                <PowerPlacement.Provider value='sidebar'>
                    <View name='server.power' className='mt-3.5' />
                </PowerPlacement.Provider>
            )}
            <span aria-hidden className={cn('absolute top-[9px] right-[9px] bottom-[9px] w-[5px] rounded-full', stateFill(model.state))} />
        </div>
    );
}

/**
 * The server area. The shell renders outside the server's context, so this layout, which renders
 * inside it, puts the server's block into the sidebar through a portal.
 */
export function ServerLayout({ model, children }: ViewProps<'layout.server'>) {
    const slot = useContext(SidebarServerSlot);

    return (
        <>
            {slot && createPortal(<ServerBlock model={model} />, slot)}
            <Main>{children}</Main>
        </>
    );
}
